import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Pool } from "pg";
import { migrate, seedDemo } from "../scripts/auth-db";
import { createAuthentication } from "../src/lib/auth-config";
import {
  ensureWorkspace,
  getOwnedMeeting,
  saveOwnedMeeting,
  type Owner,
} from "../src/lib/workspace-store";
import {
  createClipShare,
  revokeClipShares,
  publicClip,
  guestView,
  listClipShares,
} from "../src/lib/clip-shares";
import { extractUploadedClip, prepareClipBytes } from "../src/lib/clip-preparation";
import { clipAudioResponse } from "../src/lib/clip-response";
import type { Clip } from "../src/lib/journey";
import { getMeeting } from "../src/lib/data";
function wave() {
  const pcm = Buffer.alloc(4 * 16000 * 2);
  for (let i = 0; i < pcm.length / 2; i++) pcm.writeInt16LE((i % 30000) - 15000, i * 2);
  const out = Buffer.alloc(44 + pcm.length);
  out.write("RIFF");
  out.writeUInt32LE(out.length - 8, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(16000, 24);
  out.writeUInt32LE(32000, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(pcm.length, 40);
  pcm.copy(out, 44);
  return out;
}
test("server decoder returns exact PCM samples for beginning, middle and ending ranges", async () => {
  const source = wave();
  const minimum = await extractUploadedClip(source, 1.1, 1.2);
  assert.equal(minimum.readUInt32LE(40), 3200);
  for (const [start, end] of [
    [0, 0.27],
    [1.125, 2.875],
    [3.125, 4],
  ]) {
    const out = await extractUploadedClip(source, start, end);
    const expected = source.subarray(
      44 + Math.round(start * 16000) * 2,
      44 + Math.round(end * 16000) * 2,
    );
    assert.equal(out.readUInt32LE(40), expected.length);
    assert.deepEqual(out.subarray(44), expected);
    assert.equal(out.readUInt32LE(24), 16000);
  }
  await assert.rejects(extractUploadedClip(source, 2, 1));
  await assert.rejects(extractUploadedClip(source, 0, 121));
  await assert.rejects(extractUploadedClip(source, 0, 4.5));
});
test("clip media supports only artifact-local byte ranges and no-store responses", async () => {
  const bytes = wave();
  let response = clipAudioResponse(
    bytes,
    new Request("http://fixture", { headers: { range: "bytes=0-99" } }),
  );
  assert.equal(response.status, 206);
  assert.equal((await response.arrayBuffer()).byteLength, 100);
  assert.equal(response.headers.get("content-range"), `bytes 0-99/${bytes.length}`);
  assert(response.headers.get("cache-control")?.includes("no-store"));
  for (const range of ["bytes=9999999-", "bytes=0-5,10-15", "bytes=8-2", "bytes=-0"])
    assert.equal(
      clipAudioResponse(bytes, new Request("http://fixture", { headers: { range } })).status,
      416,
    );
  response = clipAudioResponse(bytes, new Request("http://fixture", { method: "HEAD" }));
  assert.equal((await response.arrayBuffer()).byteLength, 0);
  assert.equal(response.headers.get("location"), null);
});
test("guest transcript omits partial utterances and private identifiers, notes and other voices", () => {
  const meeting = getMeeting("atlas-launch")!;
  const source = meeting.segments[1];
  const view = guestView(
    meeting,
    {
      id: "private-database-id",
      title: "Fixture clip",
      start: source.start + 0.2,
      end: source.end - 0.2,
    },
    Date.now() + 10000,
  );
  assert.equal(view.segments.length, 0);
  assert.equal(view.participants.length, 0);
  assert.equal(view.clip.id, "shared-clip");
  const serialized = JSON.stringify(view);
  assert(!serialized.includes("private-database-id"));
  assert(!serialized.includes(meeting.id));
  assert(!serialized.includes("mediaUrl"));
  const full = guestView(
    meeting,
    { id: "private", title: "Fixture", start: source.start, end: source.end },
    Date.now() + 10000,
  );
  assert.equal(full.segments.length, 1);
  assert.equal(full.segments[0].text, source.text);
  assert(!full.segments.some((s) => s.id === source.id));
});
test("revocable database clip grants enforce persistence, ownership, expiry, edits, deletion and concurrent preparation", async () => {
  const old = process.env.SHARE_SECRET;
  process.env.SHARE_SECRET = randomBytes(32).toString("hex");
  const db = await PGlite.create();
  const server = new PGLiteSocketServer({
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
  try {
    await migrate(pool);
    await migrate(pool);
    const auth = createAuthentication({
      pool,
      origin: "http://localhost:3002",
      secret: randomBytes(32).toString("hex"),
    });
    async function owner(email: string): Promise<Owner> {
      const password = randomBytes(20).toString("hex");
      await seedDemo(pool, email, password);
      const r = await auth.api.signInEmail({ body: { email, password } });
      return {
        userId: r.user.id,
        sessionId: (await pool.query('SELECT id FROM session WHERE "userId"=$1', [r.user.id]))
          .rows[0].id,
        demo: false,
      };
    }
    const a = await owner("clip-owner@example.test"),
      b = await owner("clip-other@example.test");
    await ensureWorkspace(pool, a);
    await ensureWorkspace(pool, b);
    const clip: Clip = { id: randomUUID(), title: "Fixture moment", start: 1.25, end: 9.75 };
    const id = "atlas-launch";
    async function persist(clips: Clip[]) {
      const saved = (await getOwnedMeeting(pool, a, id))!;
      assert.equal(
        typeof (await saveOwnedMeeting(pool, a, id, { ...saved.state, clips }, saved.revision)),
        "number",
      );
    }
    let preparations = 0;
    const prepare = async () => {
      preparations++;
      return "clips/fixture.wav";
    };
    const cleanup = async () => {};
    await assert.rejects(createClipShare(pool, a, id, clip, prepare, cleanup), /Save the clip/);
    await persist([clip]);
    await assert.rejects(createClipShare(pool, b, id, clip, prepare, cleanup), /Save the clip/);
    await assert.rejects(
      createClipShare(pool, { ...a, userId: b.userId }, id, clip, prepare, cleanup),
      /Meeting not found/,
    );
    assert.equal(preparations, 0);
    const link = await createClipShare(pool, a, id, clip, prepare, cleanup);
    const token = link.path.slice("/share/".length);
    assert(/^v2\.[A-Za-z0-9_-]{43}$/.test(token));
    assert(await publicClip(pool, token));
    assert.equal((await createClipShare(pool, a, id, clip, prepare, cleanup)).path, link.path);
    assert.equal(preparations, 1);
    assert.equal((await listClipShares(pool, a, id))[0].active, true);
    await assert.rejects(revokeClipShares(pool, b, "not-owned", clip.id));
    assert(await publicClip(pool, token));
    await revokeClipShares(pool, a, id, clip.id);
    assert.equal(await publicClip(pool, token), null);
    const exp = await createClipShare(pool, a, id, clip, prepare, cleanup);
    await pool.query(
      "UPDATE sounding_clip_share SET expires_at=now()-interval '1 second' WHERE token_hash IS NOT NULL AND revoked_at IS NULL",
    );
    assert.equal(await publicClip(pool, exp.path.slice(7)), null);
    const altered = await createClipShare(pool, a, id, clip, prepare, cleanup);
    await persist([{ ...clip, end: 10 }]);
    assert.equal(await publicClip(pool, altered.path.slice(7)), null);
    await persist([clip]);
    assert.equal(
      await publicClip(pool, altered.path.slice(7)),
      null,
      "Restoring old boundaries must never revive a revoked grant",
    );
    let release!: (key: string) => void, started!: () => void;
    const gate = new Promise<void>((r) => (started = r));
    const pending = createClipShare(
      pool,
      a,
      id,
      { ...clip, title: "Changed title" },
      prepare,
      cleanup,
    );
    await assert.rejects(pending, /Save the clip/);
    await revokeClipShares(pool, a, id, clip.id);
    let cleaned = false;
    const preparing = createClipShare(
      pool,
      a,
      id,
      clip,
      async () => {
        started();
        return new Promise<string>((r) => (release = r));
      },
      async () => {
        cleaned = true;
      },
    );
    await gate;
    await assert.rejects(createClipShare(pool, a, id, clip, prepare, cleanup), /in progress/);
    await revokeClipShares(pool, a, id, clip.id);
    release("clips/disposable.wav");
    await assert.rejects(preparing, /disabled/);
    assert(cleaned);
    const deleted = await createClipShare(pool, a, id, clip, prepare, cleanup);
    await persist([]);
    assert.equal(await publicClip(pool, deleted.path.slice(7)), null);
    await persist([clip]);
    await pool.query("UPDATE session SET \"expiresAt\"=now()-interval '1 minute' WHERE id=$1", [
      a.sessionId,
    ]);
    await assert.rejects(createClipShare(pool, a, id, clip, prepare, cleanup), /Meeting not found/);
    assert.equal(
      await publicClip(pool, token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")),
      null,
    );
  } finally {
    await pool.end();
    await server.stop();
    await db.close();
    if (old === undefined) delete process.env.SHARE_SECRET;
    else process.env.SHARE_SECRET = old;
  }
});

test("long demo excerpt stays below serverless response limits without exposing full media", async () => {
  const meeting = getMeeting("atlas-launch")!;
  const audio = await prepareClipBytes(meeting, {
    id: "fixture",
    title: "Full fictional excerpt",
    start: 0,
    end: meeting.duration,
  });
  assert(audio);
  assert(audio.length < 4_000_000);
  assert.equal(audio.readUInt32LE(24), 16000);
  assert(Math.abs(audio.readUInt32LE(40) / audio.readUInt32LE(28) - meeting.duration) < 1 / 16000);
});
