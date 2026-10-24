import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Pool } from "pg";
import { createAuthentication, type AuthMail } from "../src/lib/auth-config";
import { migrate, seedDemo } from "../scripts/auth-db";
import {
  ensureWorkspace,
  getOwnedMeeting,
  saveOwnedMeeting,
  type Owner,
} from "../src/lib/workspace-store";
import { safeReturnPath } from "../src/lib/http-security";

test("database-backed authentication and owner isolation", async (t) => {
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
    mails: AuthMail[] = [];
  const auth = createAuthentication({
    pool,
    origin,
    secret: randomBytes(32).toString("hex"),
    sendMail: async (mail) => {
      mails.push(mail);
    },
  });
  const password = randomBytes(24).toString("base64url");
  const request = async (path: string, body?: object, cookie?: string, host = origin) => {
    const headers = new Headers({
      origin: host,
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    });
    if (cookie) headers.set("cookie", cookie);
    return auth.handler(
      new Request(origin + "/api/auth" + path, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  };
  const cookie = (r: Response) =>
    r.headers
      .getSetCookie()
      .find((x) => x.includes("session_token="))
      ?.split(";")[0] ?? "";
  async function signup(email: string) {
    const response = await request("/sign-up/email", {
      name: "Private tester",
      email,
      password,
      callbackURL: origin + "/home",
    });
    assert.ok(response.ok, "Private signup should succeed with test-only email delivery.");
    const mail = mails.find((m) => m.to === email && m.subject.startsWith("Verify"));
    assert.ok(mail, "Verification email must be delivered.");
    const result = await auth.handler(new Request(mail.url));
    assert.ok(result.status === 200 || result.status === 302, "Verification must succeed.");
  }
  async function login(email: string) {
    const response = await request("/sign-in/email", { email, password });
    assert.ok(response.ok, "Valid credentials must create a session.");
    const value = cookie(response);
    assert.ok(!!value, "Session cookie must exist.");
    const session = await auth.api.getSession({ headers: new Headers({ cookie: value }) });
    assert.ok(session, "Server must resolve the session.");
    return {
      cookie: value,
      session,
      owner: { userId: session.user.id, sessionId: session.session.id, demo: false } as Owner,
    };
  }
  try {
    await migrate(pool);
    await t.test("schema migration is repeatable", async () => {
      await migrate(pool);
      const q = await pool.query("SELECT count(*)::int AS count FROM sounding_migration");
      assert.ok(q.rows[0].count === 5);
    });
    await t.test(
      "no-mail configuration rejects signup without creating an inactive account",
      async () => {
        const unavailable = createAuthentication({
          pool,
          origin,
          secret: randomBytes(32).toString("hex"),
        });
        const response = await unavailable.handler(
          new Request(origin + "/api/auth/sign-up/email", {
            method: "POST",
            headers: { origin, "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Blocked signup",
              email: "blocked@example.test",
              password,
            }),
          }),
        );
        assert(!response.ok);
        assert.equal(cookie(response), "");
        const count = await pool.query('SELECT count(*)::int AS count FROM "user" WHERE email=$1', [
          "blocked@example.test",
        ]);
        assert.equal(count.rows[0].count, 0);
      },
    );
    await t.test("unverified signup cannot authenticate", async () => {
      const response = await request("/sign-up/email", {
        name: "Not verified",
        email: "unverified@example.test",
        password,
      });
      assert.ok(response.ok);
      const login = await request("/sign-in/email", { email: "unverified@example.test", password });
      assert.ok(!login.ok, "Email verification must be enforced.");
    });
    await signup("alice@example.test");
    await signup("bob@example.test");
    const alice = await login("alice@example.test"),
      bob = await login("bob@example.test");
    await t.test("duplicate signup cannot replace an account or its password", async () => {
      await pool.query('DELETE FROM "rateLimit"');
      const before = await pool.query('SELECT password FROM account WHERE "userId"=$1', [
        alice.owner.userId,
      ]);
      const response = await request("/sign-up/email", {
        name: "Replacement",
        email: "alice@example.test",
        password: randomBytes(24).toString("base64url"),
      });
      assert.equal(cookie(response), "");
      const users = await pool.query('SELECT count(*)::int AS count FROM "user" WHERE email=$1', [
        "alice@example.test",
      ]);
      const after = await pool.query('SELECT password FROM account WHERE "userId"=$1', [
        alice.owner.userId,
      ]);
      assert.equal(users.rows[0].count, 1);
      assert.equal(after.rows[0].password, before.rows[0].password);
      // The verification-required provider may use a generic success to prevent enumeration.
      assert(response.ok || response.status === 400 || response.status === 422);
    });
    await t.test(
      "credential errors do not distinguish wrong password from unknown email",
      async () => {
        await pool.query('DELETE FROM "rateLimit"');
        const wrong = await request("/sign-in/email", {
          email: "alice@example.test",
          password: "incorrect-password-for-audit",
        });
        const unknown = await request("/sign-in/email", {
          email: "absent@example.test",
          password: "incorrect-password-for-audit",
        });
        assert.equal(wrong.status, 401);
        assert.equal(unknown.status, wrong.status);
        assert.deepEqual(await unknown.json(), await wrong.json());
        assert.equal(cookie(wrong), "");
        assert.equal(cookie(unknown), "");
      },
    );
    await t.test("forged pre-login cookies cannot fix the authenticated session", async () => {
      await pool.query('DELETE FROM "rateLimit"');
      const forged = "sounding.session_token=attacker-chosen-token";
      assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: forged }) }), null);
      const response = await request(
        "/sign-in/email",
        { email: "alice@example.test", password },
        forged,
      );
      assert(response.ok);
      const issued = cookie(response);
      assert(issued && issued !== forged);
      assert(await auth.api.getSession({ headers: new Headers({ cookie: issued }) }));
      assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: forged }) }), null);
      await request("/sign-out", {}, issued);
      assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: issued }) }), null);
    });
    await t.test(
      "signup validates email and password length before creating credentials",
      async () => {
        await pool.query('DELETE FROM "rateLimit"');
        for (const body of [
          { name: "Validation", email: "not-an-email", password },
          { name: "Validation", email: "short@example.test", password: "short" },
          { name: "Validation", email: "long@example.test", password: "x".repeat(129) },
        ]) {
          const response = await request("/sign-up/email", body);
          assert(!response.ok);
          assert.equal(cookie(response), "");
        }
        const count = await pool.query(
          'SELECT count(*)::int AS count FROM "user" WHERE email IN ($1,$2)',
          ["short@example.test", "long@example.test"],
        );
        assert.equal(count.rows[0].count, 0);
      },
    );
    await t.test("passwords are hashed; session cookie has HttpOnly and SameSite", async () => {
      const result = await pool.query('SELECT password FROM account WHERE "userId"=$1', [
        alice.owner.userId,
      ]);
      assert.ok(result.rows[0].password !== password && result.rows[0].password.length > 64);
      const response = await request("/sign-in/email", { email: "bob@example.test", password });
      const secondHash = await hashPassword(password);
      assert.notEqual(
        secondHash,
        result.rows[0].password,
        "Same password receives a fresh random salt.",
      );
      assert(await verifyPassword({ hash: result.rows[0].password, password }));
      assert(
        !(await verifyPassword({ hash: result.rows[0].password, password: "wrong-password" })),
      );
      const header = response.headers.getSetCookie().join(";");
      assert.ok(header.includes("HttpOnly") && /SameSite=Lax/i.test(header));
      const invalid = await request("/sign-in/email", {
        email: "alice@example.test",
        password: randomBytes(20).toString("hex"),
      });
      assert.ok(!invalid.ok, "Invalid password must fail.");
    });
    await t.test("private workspaces reject owner spoofing and persist independently", async () => {
      await ensureWorkspace(pool, alice.owner);
      await ensureWorkspace(pool, bob.owner);
      const a = await getOwnedMeeting(pool, alice.owner, "atlas-launch");
      assert.ok(a);
      const changed = {
        ...a.state,
        actions: [
          ...a.state.actions,
          { id: "private-action", text: "Only Alice can read this action", time: 0, done: false },
        ],
      };
      assert.ok((await saveOwnedMeeting(pool, alice.owner, "atlas-launch", changed, 0)) === 1);
      const b = await getOwnedMeeting(pool, bob.owner, "atlas-launch");
      assert.ok(b);
      assert.ok(!b.state.actions.some((x) => x.id === "private-action"));
      const forged = { ...alice.owner, userId: bob.owner.userId };
      assert.ok((await getOwnedMeeting(pool, forged, "atlas-launch")) === null);
      assert.ok((await saveOwnedMeeting(pool, forged, "atlas-launch", changed, 1)) === "missing");
      const again = await login("alice@example.test");
      const persisted = await getOwnedMeeting(pool, again.owner, "atlas-launch");
      assert.ok(persisted?.state.actions.some((x) => x.id === "private-action"));
    });
    await t.test("stale revisions and invalid participants/timestamps are rejected", async () => {
      const a = await getOwnedMeeting(pool, alice.owner, "atlas-launch");
      assert.ok(a);
      assert.ok(
        (await saveOwnedMeeting(pool, alice.owner, "atlas-launch", a.state, 0)) === "conflict",
      );
      const invalid = {
        ...a.state,
        actions: [
          { id: "invalid", text: "Invalid", time: 0, done: false, assignee: "not-a-participant" },
        ],
      };
      assert.ok(
        (await saveOwnedMeeting(pool, alice.owner, "atlas-launch", invalid, 1)) === "invalid",
      );
      assert.ok((await getOwnedMeeting(pool, alice.owner, "unknown")) === null);
    });
    await t.test("demo email/password sessions have independent visitor workspaces", async () => {
      await seedDemo(pool, "demo@example.test", password);
      const first = await login("demo@example.test"),
        second = await login("demo@example.test");
      first.owner.demo = true;
      second.owner.demo = true;
      await ensureWorkspace(pool, first.owner);
      await ensureWorkspace(pool, second.owner);
      const a = await getOwnedMeeting(pool, first.owner, "atlas-launch");
      assert.ok(a);
      const changed = {
        ...a.state,
        preferences: { ...a.state.preferences, guidance: "First visitor only" },
      };
      assert.ok((await saveOwnedMeeting(pool, first.owner, "atlas-launch", changed, 0)) === 1);
      const b = await getOwnedMeeting(pool, second.owner, "atlas-launch");
      assert.ok(b?.state.preferences.guidance === "");
      const response = await request("/sign-out", {}, first.cookie);
      assert.ok(response.ok);
      const session = await auth.api.getSession({ headers: new Headers({ cookie: first.cookie }) });
      assert.ok(!session);
      assert.ok(
        (await getOwnedMeeting(pool, first.owner, "atlas-launch")) === null,
        "Logout must cascade-delete the demo workspace.",
      );
      assert.ok((await getOwnedMeeting(pool, second.owner, "atlas-launch")) !== null);
    });
    await t.test(
      "expired server sessions fail and cross-origin requests are rejected",
      async () => {
        await pool.query('DELETE FROM "rateLimit"');
        const loginResult = await login("bob@example.test");
        await pool.query("UPDATE session SET \"expiresAt\"=now()-interval '1 minute' WHERE id=$1", [
          loginResult.session.session.id,
        ]);
        const expired = await auth.api.getSession({
          headers: new Headers({ cookie: loginResult.cookie }),
        });
        assert.ok(!expired);
        const forged = await request(
          "/sign-in/email",
          { email: "bob@example.test", password },
          undefined,
          "https://attacker.example",
        );
        assert.ok(forged.status === 403);
      },
    );
    await t.test("password reset is delivered, one-use and revokes existing sessions", async () => {
      await pool.query('DELETE FROM "rateLimit"');
      const before = await login("alice@example.test");
      const response = await request("/request-password-reset", {
        email: "alice@example.test",
        redirectTo: origin + "/reset-password",
      });
      assert.ok(response.ok);
      const mail = mails.find(
        (m) => m.to === "alice@example.test" && m.subject.startsWith("Reset"),
      );
      assert.ok(mail);
      // Follow library reset redirect in memory only; no secret URL enters output.
      const jump = await auth.handler(new Request(mail.url));
      const target = jump.headers.get("location");
      assert.ok(target);
      const token = new URL(target, origin).searchParams.get("token");
      assert.ok(token);
      const updated = randomBytes(24).toString("base64url");
      const result = await request("/reset-password", { token, newPassword: updated });
      assert.ok(result.ok);
      const reused = await request("/reset-password", { token, newPassword: password });
      assert.ok(!reused.ok);
      const old = await auth.api.getSession({ headers: new Headers({ cookie: before.cookie }) });
      assert.ok(!old);
      const valid = await request("/sign-in/email", {
        email: "alice@example.test",
        password: updated,
      });
      assert.ok(valid.ok);
    });
    await t.test(
      "unknown reset addresses receive the same generic success; redirects are constrained",
      async () => {
        const response = await request("/request-password-reset", {
          email: "missing@example.test",
          redirectTo: origin + "/reset-password",
        });
        assert.ok(response.ok);
        for (const value of [
          "//attacker.example",
          "https://attacker.example",
          "/\\attacker.example",
          "/api/auth/sign-out",
          "/%2f%2fattacker.example",
          "/home\\\\attacker.example",
          "/capture/../../api/auth/sign-out",
        ])
          assert.ok(safeReturnPath(value) === "/home");
        assert.ok(
          safeReturnPath("/calls/atlas-launch?tab=transcript") ===
            "/calls/atlas-launch?tab=transcript",
        );
      },
    );
    await t.test(
      "expired reset tokens are rejected and credential attempts are rate limited",
      async () => {
        await pool.query('DELETE FROM "rateLimit"');
        const response = await request("/request-password-reset", {
          email: "bob@example.test",
          redirectTo: origin + "/reset-password",
        });
        assert.ok(response.ok);
        const mail = mails
          .filter((m) => m.to === "bob@example.test" && m.subject.startsWith("Reset"))
          .at(-1);
        assert.ok(mail);
        const jump = await auth.handler(new Request(mail.url));
        const target = jump.headers.get("location");
        assert.ok(target);
        const token = new URL(target, origin).searchParams.get("token");
        assert.ok(token);
        await pool.query("UPDATE verification SET \"expiresAt\"=now()-interval '1 minute'");
        const expired = await request("/reset-password", {
          token,
          newPassword: randomBytes(24).toString("base64url"),
        });
        assert.ok(!expired.ok);
        await pool.query('DELETE FROM "rateLimit"');
        let limited = false;
        for (let i = 0; i < 10; i++) {
          const result = await request("/sign-in/email", {
            email: "bob@example.test",
            password: randomBytes(20).toString("hex"),
          });
          if (result.status === 429) {
            limited = true;
            break;
          }
        }
        assert.ok(limited, "Credential attempts must be rate limited in the database.");
      },
    );
    await t.test("HTTPS sessions require Secure cookies", async () => {
      await pool.query('DELETE FROM "rateLimit"');
      const secureOrigin = "https://preview.sounding.example";
      const secureAuth = createAuthentication({
        pool,
        origin: secureOrigin,
        secret: randomBytes(32).toString("hex"),
      });
      const response = await secureAuth.handler(
        new Request(secureOrigin + "/api/auth/sign-in/email", {
          method: "POST",
          headers: { origin: secureOrigin, "Content-Type": "application/json" },
          body: JSON.stringify({ email: "bob@example.test", password }),
        }),
      );
      assert.ok(response.ok);
      const cookies = response.headers.getSetCookie().join(";");
      assert.ok(
        /Secure/.test(cookies) && /HttpOnly/.test(cookies) && /SameSite=Lax/i.test(cookies),
      );
    });
    await t.test("OAuth-only accounts do not receive Sounding password-reset emails", async () => {
      await pool.query('DELETE FROM "rateLimit"');
      const userId = "oauth-only-user";
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,now(),now())',
        [userId, "OAuth-only fixture", "oauth-only@example.test"],
      );
      await pool.query(
        'INSERT INTO account(id,"accountId","providerId","userId","createdAt","updatedAt") VALUES($1,$2,$3,$4,now(),now())',
        ["oauth-only-account", "fixture-provider-id", "google", userId],
      );
      const count = mails.length;
      const response = await request("/request-password-reset", {
        email: "oauth-only@example.test",
        redirectTo: origin + "/reset-password",
      });
      assert.ok(response.ok, "Provider-only accounts receive the same generic reset response.");
      assert.ok(
        mails.length === count,
        "No password-reset email is sent for a provider-only account.",
      );
    });
  } finally {
    await pool.end();
    await server.stop();
    await db.close();
  }
});
