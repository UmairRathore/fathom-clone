import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { processingApproved, budgetRecordingApproved } from "../src/lib/recordings/approval";
import { reserveAIRequest } from "../src/lib/recordings/budget";

const deadline = "2026-11-26T00:00:00.000Z";
test("processing window admits any owned recording until the exclusive UTC deadline", () => {
  const env = { AI_PROCESSING_ENABLED: "true", AI_PROCESSING_UNTIL: deadline };
  assert(processingApproved("new-recording", env, Date.parse(deadline) - 1));
  assert(!processingApproved("new-recording", env, Date.parse(deadline)));
  assert(!processingApproved("new-recording", env, Date.parse(deadline) + 1));
  assert(!processingApproved("new-recording", { ...env, AI_PROCESSING_ENABLED: "false" }, 0));
  assert(
    !processingApproved(
      "old",
      { ...env, AI_PROCESSING_UNTIL: "invalid", AI_APPROVED_RECORDING_ID: "old" },
      0,
    ),
  );
  assert(!budgetRecordingApproved("old", "old", env, Date.parse(deadline)));
  const legacy = {
    AI_PROCESSING_ENABLED: "true",
    AI_APPROVED_RECORDING_ID: "old",
    AI_PROCESSING_UNTIL: "",
  };
  assert(processingApproved("old", legacy));
  assert(!processingApproved("new", legacy));
  assert(budgetRecordingApproved("old", "old", legacy));
});

test("window keeps the shared ledger bounded, durable and duplicate-safe", async () => {
  const prior = {
    enabled: process.env.AI_PROCESSING_ENABLED,
    until: process.env.AI_PROCESSING_UNTIL,
  };
  process.env.AI_PROCESSING_ENABLED = "true";
  process.env.AI_PROCESSING_UNTIL = new Date(Date.now() + 60000).toISOString();
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
    await pool.query(`CREATE TABLE sounding_ai_budget (scope text PRIMARY KEY, approved_recording_id text, authorized_cents integer CHECK (authorized_cents BETWEEN 0 AND 100), reserved_cents integer);
      CREATE TABLE sounding_ai_request (recording_id text, operation text, scope text, model text, reserved_cents integer, status text, PRIMARY KEY(recording_id, operation));
      INSERT INTO sounding_ai_budget VALUES ('module1','legacy-only',100,40)`);
    await pool.query(readFileSync("migrations/008-ai-budget-ceiling.sql", "utf8"));
    assert.equal(
      (await pool.query("SELECT reserved_cents FROM sounding_ai_budget")).rows[0].reserved_cents,
      40,
    );
    await pool.query("UPDATE sounding_ai_budget SET authorized_cents=200,reserved_cents=160");
    await assert.rejects(db.exec("UPDATE sounding_ai_budget SET authorized_cents=201"));
    await reserveAIRequest(pool, "user-a-recording", "transcription", "test-model");
    await assert.rejects(
      reserveAIRequest(pool, "user-a-recording", "transcription", "test-model"),
      { code: "billable_request_already_reserved" },
    );
    const results = await Promise.allSettled([
      reserveAIRequest(pool, "user-b-recording", "transcription", "test-model"),
      reserveAIRequest(pool, "user-c-recording", "transcription", "test-model"),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      (await pool.query("SELECT reserved_cents FROM sounding_ai_budget")).rows[0].reserved_cents,
      200,
    );
    assert.equal(
      (await pool.query("SELECT count(*)::int AS count FROM sounding_ai_request")).rows[0].count,
      2,
    );
    await pool.query("UPDATE sounding_ai_budget SET reserved_cents=0");
    process.env.AI_PROCESSING_UNTIL = new Date(Date.now() - 1000).toISOString();
    await assert.rejects(reserveAIRequest(pool, "legacy-only", "analysis", "test-model"), {
      code: "spending_approval_required",
    });
    assert.equal(
      (await pool.query("SELECT reserved_cents FROM sounding_ai_budget")).rows[0].reserved_cents,
      0,
    );
  } finally {
    if (prior.enabled === undefined) delete process.env.AI_PROCESSING_ENABLED;
    else process.env.AI_PROCESSING_ENABLED = prior.enabled;
    if (prior.until === undefined) delete process.env.AI_PROCESSING_UNTIL;
    else process.env.AI_PROCESSING_UNTIL = prior.until;
    await pool.end();
    await server.stop();
    await db.close();
  }
});
