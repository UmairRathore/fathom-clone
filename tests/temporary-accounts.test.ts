import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Pool } from "pg";
import { migrate, seedDemo } from "../scripts/auth-db";
import { createAuthentication } from "../src/lib/auth-config";
import {
  createTemporaryAccount,
  temporaryAccount,
  temporaryNameSchema,
  RegistrationLimited,
} from "../src/lib/temporary-accounts";
import { cleanupTemporaryAccounts } from "../src/lib/temporary-cleanup";
import {
  ensureWorkspace,
  getOwnedMeeting,
  saveOwnedMeeting,
  type Owner,
} from "../src/lib/workspace-store";
import { createClipShare, publicClip } from "../src/lib/clip-shares";
import { getRecording } from "../src/lib/recordings/jobs";

test("disposable accounts enforce absolute expiry and durable private-object deletion", async (t) => {
  const db = await PGlite.create(),
    server = new PGLiteSocketServer({
      db,
      host: "127.0.0.1",
      port: 0,
      maxConnections: 1,
      inspect: false,
      debug: false,
    });
  await server.start();
  const pool = new Pool({
    connectionString: `postgresql://postgres@${server.getServerConn()}/postgres`,
    max: 1,
    idleTimeoutMillis: 50,
  });
  const origin = "http://localhost:3002",
    auth = createAuthentication({ pool, origin, secret: randomBytes(32).toString("hex") });
  const login = async (email: string, password: string) =>
    auth.handler(
      new Request(origin + "/api/auth/sign-in/email", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );
  const cookie = (r: Response) =>
    r.headers
      .getSetCookie()
      .find((x) => x.includes("session_token="))
      ?.split(";")[0] ?? "";
  const actor = async (r: Response) => {
    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookie(r) }) });
    assert(session);
    return { userId: session.user.id, sessionId: session.session.id, demo: false } as Owner;
  };
  try {
    await migrate(pool);
    await t.test("name-only request rejects empty names and added credential fields", () => {
      for (const input of [
        { name: " " },
        { name: "x".repeat(81) },
        { name: "Tester", email: "real@example.test" },
        { name: "Tester", password: "provided" },
      ])
        assert(!temporaryNameSchema.safeParse(input).success);
      assert(temporaryNameSchema.safeParse({ name: "  Evaluator  " }).success);
    });
    const one = await createTemporaryAccount(pool, { name: "First evaluator" }),
      two = await createTemporaryAccount(pool, { name: "Second evaluator" });
    await t.test(
      "credentials are unique, high-entropy, hashed only, and expire exactly 24 hours later",
      async () => {
        assert(one.loginId !== two.loginId && one.password !== two.password);
        assert(/^demo-[a-f0-9]{32}@sounding\.local$/.test(one.loginId));
        assert(one.password.length === 32);
        assert(new Date(one.expiresAt).getTime() - new Date(one.createdAt).getTime() === 86400000);
        const account = (
          await pool.query('SELECT password FROM account WHERE "userId"=$1', [one.id])
        ).rows[0];
        assert(account.password !== one.password && account.password.includes(":"));
        const raw = JSON.stringify(
          (
            await pool.query('SELECT row_to_json(a) AS data FROM account a WHERE "userId"=$1', [
              one.id,
            ])
          ).rows,
        );
        assert(!raw.includes(one.password));
      },
    );
    const signed = await login(one.loginId, one.password),
      a = await actor(signed),
      b = await actor(await login(two.loginId, two.password));
    await ensureWorkspace(pool, a);
    await ensureWorkspace(pool, b);
    await t.test(
      "generated credentials sign in, wrong passwords fail and accounts remain isolated",
      async () => {
        assert(signed.ok);
        assert((await login(one.loginId, "incorrect-password-fixture")).status === 401);
        const m = (await getOwnedMeeting(pool, a, "atlas-launch"))!;
        const changed = {
          ...m.state,
          preferences: { ...m.state.preferences, guidance: "First temporary workspace only" },
        };
        assert((await saveOwnedMeeting(pool, a, "atlas-launch", changed, m.revision)) === 1);
        assert((await getOwnedMeeting(pool, b, "atlas-launch"))!.state.preferences.guidance === "");
        await auth.api.signOut({ headers: new Headers({ cookie: cookie(signed) }) });
        assert(
          (await auth.api.getSession({ headers: new Headers({ cookie: cookie(signed) }) })) ===
            null,
        );
      },
    );
    await t.test(
      "relogin preserves account deadline and caps every session without extending lifetime",
      async () => {
        const before = await temporaryAccount(pool, one.id);
        const again = await login(one.loginId, one.password);
        assert(again.ok);
        const after = await temporaryAccount(pool, one.id);
        assert(before!.expires_at.getTime() === after!.expires_at.getTime());
        const session = await auth.api.getSession({
          headers: new Headers({ cookie: cookie(again) }),
        });
        assert(session);
        assert(session.session.expiresAt.getTime() <= after!.expires_at.getTime());
        assert(
          (await getOwnedMeeting(pool, await actor(again), "atlas-launch"))!.state.preferences
            .guidance === "First temporary workspace only",
        );
        // Database independently prevents extensions through another session-write path.
        await pool.query(
          'UPDATE session SET "expiresAt"=now()+interval \'7 days\' WHERE "userId"=$1',
          [one.id],
        );
        const count = await pool.query(
          'SELECT count(*)::int AS count FROM session s JOIN sounding_temporary_account t ON t.user_id=s."userId" WHERE s."expiresAt">t.expires_at',
        );
        assert(count.rows[0].count === 0);
      },
    );
    const renewed = await login(one.loginId, one.password),
      owner = await actor(renewed),
      stored = (await getOwnedMeeting(pool, owner, "atlas-launch"))!;
    const clip = { id: "expiry-clip", title: "Temporary clip fixture", start: 13, end: 23 };
    await saveOwnedMeeting(
      pool,
      owner,
      "atlas-launch",
      { ...stored.state, clips: [clip] },
      stored.revision,
    );
    const previousSecret = process.env.SHARE_SECRET;
    process.env.SHARE_SECRET = randomBytes(32).toString("hex");
    const objects = new Set<string>();
    const share = await createClipShare(
      pool,
      owner,
      "atlas-launch",
      clip,
      async (_m, _c, id) => {
        const key = `clips/${id}.wav`;
        objects.add(key);
        return key;
      },
      async (key) => {
        objects.delete(key);
      },
    );
    await t.test("guest grants cannot outlive the account", async () => {
      assert(share.expiresAt <= (await temporaryAccount(pool, one.id))!.expires_at.getTime());
      assert(await publicClip(pool, share.path.split("/").at(-1)!));
    });
    const recordingId = randomUUID(),
      recordingKey = `recordings/${recordingId}/original.wav`;
    objects.add(recordingKey);
    await pool.query(
      "INSERT INTO sounding_recording(id,owner_id,workspace_id,request_key,title,filename,mime_type,size_bytes,media_key,status) VALUES($1,$2,$3,$4,'Fixture','fixture.wav','audio/wav',100,$5,'uploaded')",
      [recordingId, one.id, `user:${one.id}`, randomUUID(), recordingKey],
    );
    await pool.query(
      "UPDATE sounding_temporary_account SET created_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' WHERE user_id=$1",
      [one.id],
    );
    await t.test(
      "expired accounts fail login and data access even with an otherwise live session",
      async () => {
        assert(!(await login(one.loginId, one.password)).ok);
        assert((await temporaryAccount(pool, one.id))?.active === false);
        assert((await getOwnedMeeting(pool, owner, "atlas-launch")) === null);
        assert((await getRecording(pool, owner, recordingId)) === null);
        assert((await publicClip(pool, share.path.split("/").at(-1)!)) === null);
      },
    );
    await t.test(
      "storage failure retains a durable retry and credentials/data until deletion succeeds",
      async () => {
        const first = await cleanupTemporaryAccounts(pool, async () => {
          throw new Error("storage unavailable fixture");
        });
        assert(first.failed === 1 && first.completed === 0);
        assert((await pool.query('SELECT 1 FROM "user" WHERE id=$1', [one.id])).rowCount === 1);
        const pending = (
          await pool.query(
            "SELECT attempts,last_error FROM sounding_temporary_cleanup WHERE user_id=$1",
            [one.id],
          )
        ).rows[0];
        assert(pending.attempts === 1 && pending.last_error === "cleanup_retry_required");
      },
    );
    await t.test(
      "retry deletes every referenced original/derived object and cascades private records",
      async () => {
        await pool.query(
          "UPDATE sounding_temporary_cleanup SET next_attempt_at=now() WHERE user_id=$1",
          [one.id],
        );
        const done = await cleanupTemporaryAccounts(pool, async (keys) => {
          for (const key of keys) objects.delete(key);
        });
        assert(done.completed === 1 && done.failed === 0 && objects.size === 0);
        for (const table of ['"user"', "account", "session"]) {
          const key = table === '"user"' ? "id" : '"userId"';
          assert(
            (await pool.query(`SELECT 1 FROM ${table} WHERE ${key}=$1`, [one.id])).rowCount === 0,
          );
        }
        assert(
          (await pool.query("SELECT 1 FROM sounding_workspace WHERE owner_id=$1", [one.id]))
            .rowCount === 0,
        );
        assert(
          (await pool.query("SELECT 1 FROM sounding_recording WHERE owner_id=$1", [one.id]))
            .rowCount === 0,
        );
        assert(
          (
            await pool.query("SELECT 1 FROM sounding_clip_share WHERE workspace_id=$1", [
              `user:${one.id}`,
            ])
          ).rowCount === 0,
        );
      },
    );
    await t.test(
      "repeat jobs are safe, protect unexpired/permanent users and refuse misqueued permanent IDs",
      async () => {
        await seedDemo(pool, "permanent@example.test", "permanent-fixture-password");
        const permanent = (
          await pool.query('SELECT id FROM "user" WHERE email=$1', ["permanent@example.test"])
        ).rows[0].id;
        await pool.query(
          "INSERT INTO sounding_temporary_cleanup(user_id,object_keys) VALUES($1,'[]'::jsonb)",
          [permanent],
        );
        const result = await cleanupTemporaryAccounts(pool, async () => {
          throw new Error("Should not touch storage");
        });
        assert(result.failed === 1);
        assert((await pool.query('SELECT 1 FROM "user" WHERE id=$1', [permanent])).rowCount === 1);
        assert((await pool.query('SELECT 1 FROM "user" WHERE id=$1', [two.id])).rowCount === 1);
      },
    );
    await t.test(
      "anonymous registration quota is durable and cannot create unlimited accounts",
      async () => {
        await pool.query("UPDATE sounding_registration_quota SET hits=21");
        await assert.rejects(
          createTemporaryAccount(pool, { name: "Limited visitor" }),
          RegistrationLimited,
        );
      },
    );
    process.env.SHARE_SECRET = previousSecret;
  } finally {
    await pool.end();
    await server.stop();
    await db.close();
  }
});
