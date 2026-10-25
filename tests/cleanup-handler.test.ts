import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { migrate, seedDemo } from "../scripts/auth-db";
import { createTemporaryAccount } from "../src/lib/temporary-accounts";
import { getPool } from "../src/lib/db";
import handler from "../src/cleanup/handler";

test("cleanup HTTP handler authenticates and deletes only expired isolated fixtures", async () => {
  const previous = { database: process.env.DATABASE_URL, secret: process.env.CRON_SECRET, blob: process.env.BLOB_READ_WRITE_TOKEN };
  const db = await PGlite.create();
  const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 0, maxConnections: 1, inspect: false, debug: false });
  await server.start();
  process.env.DATABASE_URL = `postgresql://postgres@${server.getServerConn()}/postgres`;
  const secret = randomBytes(32).toString("hex");
  process.env.CRON_SECRET = secret;
  const pool = getPool();
  async function request(method: string, authorization?: string) {
    const result = { statusCode: 0, body: "", headers: {} as Record<string, string> };
    await handler({ method, headers: { authorization } } as IncomingMessage, {
      setHeader(name: string, value: string) { result.headers[name] = value; },
      set statusCode(value: number) { result.statusCode = value; },
      end(value = "") { result.body = value; },
    } as unknown as ServerResponse);
    return result;
  }
  try {
    await migrate(pool);
    const expired = await createTemporaryAccount(pool, { name: "Isolated expired cleanup fixture" });
    const active = await createTemporaryAccount(pool, { name: "Isolated active cleanup fixture" });
    await seedDemo(pool, "permanent-cleanup@example.test", "fixture-password-only");
    await pool.query("UPDATE sounding_temporary_account SET created_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' WHERE user_id=$1", [expired.id]);
    assert.equal((await request("GET")).statusCode, 401);
    assert.equal((await request("GET", "Bearer invalid")).statusCode, 401);
    assert.equal((await request("POST", `Bearer ${secret}`)).statusCode, 401);
    delete process.env.BLOB_READ_WRITE_TOKEN;
    assert.equal((await request("GET", `Bearer ${secret}`)).statusCode, 503);
    assert.equal((await pool.query('SELECT 1 FROM "user" WHERE id=$1', [expired.id])).rowCount, 1);
    // No object keys exist in this fixture database, so the real storage adapter is never called.
    process.env.BLOB_READ_WRITE_TOKEN = "isolated-fixture-no-storage-call";
    const accepted = await request("GET", `Bearer ${secret}`);
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.headers["Cache-Control"], "no-store");
    assert.equal(JSON.parse(accepted.body).completed, 1);
    assert.equal((await pool.query('SELECT 1 FROM "user" WHERE id=$1', [expired.id])).rowCount, 0);
    assert.equal((await pool.query('SELECT 1 FROM "user" WHERE id=$1', [active.id])).rowCount, 1);
    assert.equal((await pool.query('SELECT 1 FROM "user" WHERE email=$1', ["permanent-cleanup@example.test"])).rowCount, 1);
    assert.equal(JSON.parse((await request("GET", `Bearer ${secret}`)).body).completed, 0);
  } finally {
    await pool.end();
    await server.stop();
    await db.close();
    for (const [name, value] of Object.entries({ DATABASE_URL: previous.database, CRON_SECRET: previous.secret, BLOB_READ_WRITE_TOKEN: previous.blob })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
