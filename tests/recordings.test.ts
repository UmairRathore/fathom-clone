import test from "node:test";
import { formatTranscript, transcriptCoverage } from "../src/lib/transcript";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Pool } from "pg";
import { migrate, seedDemo } from "../scripts/auth-db";
import { createAuthentication } from "../src/lib/auth-config";
import { ensureWorkspace, getOwnedMeeting, type Owner } from "../src/lib/workspace-store";
import { inspectRecording } from "../src/lib/recordings/media";
import { uploadSchema, ProcessingError, type Analysis } from "../src/lib/recordings/schema";
import {
  createOpenAIProvider,
  parseTranscription,
  validateEvidence,
  type AIProvider,
} from "../src/lib/recordings/ai";
import {
  createRecording,
  completeRecording,
  getRecording,
  processRecording,
  cancelRecording,
} from "../src/lib/recordings/jobs";
import { estimateCostCents, reserveAIRequest } from "../src/lib/recordings/budget";
const wav = readFileSync("public/media/atlas-review.wav");
const transcript = parseTranscription(
  {
    segments: [
      { start: 0, end: 10, text: "Alex will review the report by Friday.", speaker: "A" },
      { start: 10, end: 20, text: "We decided to keep the launch small.", speaker: "B" },
      { start: 50.125, end: 52.875, text: "Middle discussion continues.", speaker: "A" },
      { start: 104.25, end: 106, text: "Closing discussion is complete.", speaker: "A" },
    ],
  },
  "gpt-4o-transcribe-diarize",
  106.10771,
);
const evidence = { segmentId: "segment-1", quote: "Alex will review the report by Friday." };
const point = { text: "Review the launch report.", sources: [evidence] };
const analysis: Analysis = {
  purpose: point,
  executiveSummary: [point],
  takeaways: [point],
  topics: [point],
  decisions: [],
  risks: [],
  openQuestions: [],
  nextSteps: [],
  actions: [
    {
      title: "Review the report",
      description: "Review the report",
      assignee: "Alex",
      dueDate: "Friday",
      source: evidence,
    },
  ],
  highlights: [{ title: "Report follow-up", description: "Review commitment", source: evidence }],
};
function wave(seconds: number) {
  const b = Buffer.alloc(44 + seconds * 8000);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(8000, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write("data", 36);
  b.writeUInt32LE(b.length - 44, 40);
  return b;
}
test("upload metadata and actual media validation", async (t) => {
  const metadata = {
    requestKey: randomUUID(),
    title: "Test",
    filename: "test.wav",
    size: wav.length,
    mime: "audio/wav",
    duration: 106.1,
  };
  assert(uploadSchema.safeParse(metadata).success);
  for (const change of [
    { filename: "bad.exe" },
    { filename: "../secret.wav" },
    { size: 24000001 },
    { duration: 301 },
    { duration: NaN },
    { mime: "text/html" },
  ])
    assert(!uploadSchema.safeParse({ ...metadata, ...change }).success);
  const actual = await inspectRecording(wav);
  assert(actual.duration > 106 && actual.duration < 107);
  assert.equal(actual.mediaType, "audio");
  await assert.rejects(inspectRecording(Buffer.from("invalid")), { code: "invalid_media" });
  await assert.rejects(inspectRecording(new Uint8Array(24000001)), { code: "invalid_size" });
  await assert.rejects(inspectRecording(wave(301)), { code: "duration_exceeded" });
  await assert.rejects(
    inspectRecording(wave(0)),
    (e: unknown) =>
      e instanceof ProcessingError && ["missing_audio", "invalid_media"].includes(e.code),
  );
  await t.test("timestamp and identity grounding", () => {
    assert.equal(transcript.speakers[0].name, "Speaker 1");
    assert.equal(transcript.segments[1].start, 10);
    assert.throws(() => parseTranscription({ text: "No timing" }, "whisper-1", 20), {
      code: "timestamps_unavailable",
    });
    assert.throws(
      () => parseTranscription({ segments: [{ start: 0, end: 99, text: "x" }] }, "whisper-1", 20),
      { code: "invalid_timestamps" },
    );
    assert.equal(
      parseTranscription(
        { segments: [{ start: 0, end: 10, text: "x", speaker: "invented" }] },
        "whisper-1",
        20,
      ).speakers[0].name,
      "Unknown speaker",
    );
    assert.deepEqual(validateEvidence(analysis, transcript), analysis);
    assert.throws(
      () =>
        validateEvidence(
          { ...analysis, actions: [{ ...analysis.actions[0], assignee: "Someone unstated" }] },
          transcript,
        ),
      { code: "unsupported_action_detail" },
    );
    assert.throws(
      () =>
        validateEvidence(
          {
            ...analysis,
            takeaways: [
              { text: "Unsupported", sources: [{ segmentId: "segment-1", quote: "not spoken" }] },
            ],
          },
          transcript,
        ),
      { code: "unsupported_evidence" },
    );
  });
});
test("OpenAI boundary uses mocks, strict output, timeouts and no automatic retry", async () => {
  assert.equal(
    estimateCostCents("transcription", { input_tokens: 1000, output_tokens: 2000 }),
    2.25,
  );
  assert.equal(
    estimateCostCents("analysis", { prompt_tokens: 1000, completion_tokens: 1000 }),
    0.075,
  );
  assert.equal(estimateCostCents("analysis", { prompt_tokens: -1, completion_tokens: 1000 }), null);
  let calls = 0;
  const request = (async (url, options) => {
    calls++;
    if (String(url).endsWith("audio/transcriptions")) {
      const form = options!.body as FormData;
      assert.equal(form.get("response_format"), "diarized_json");
      assert.equal(form.get("chunking_strategy"), "auto");
      const file = form.get("file") as File;
      assert.equal(file.name, "test.wav");
      assert.deepEqual(Buffer.from(await file.arrayBuffer()), wav);
      return Response.json({
        segments: [{ start: 0, end: 10, text: evidence.quote, speaker: "A" }],
      });
    }
    const body = JSON.parse(String(options!.body));
    assert.equal(body.model, "gpt-4o-mini");
    assert.equal(body.store, false);
    assert.equal(body.response_format.json_schema.strict, true);
    return Response.json({
      choices: [{ finish_reason: "stop", message: { content: JSON.stringify(analysis) } }],
    });
  }) as typeof fetch;
  const provider = createOpenAIProvider("unit-only-not-a-real-key", request);
  const result = await provider.transcribe(wav, "test.wav", "audio/wav", 106.1);
  await provider.analyze(result);
  assert.equal(calls, 2);
  let failures = 0;
  const broken = createOpenAIProvider("unit-only-not-a-real-key", (async () => {
    failures++;
    return Response.json({ error: "private provider detail" }, { status: 500 });
  }) as typeof fetch);
  await assert.rejects(broken.transcribe(wav, "test.wav", "audio/wav", 106.1), {
    code: "provider_failed",
  });
  assert.equal(failures, 1);
  const malformed = createOpenAIProvider("unit-only-not-a-real-key", (async () =>
    Response.json({
      choices: [{ finish_reason: "stop", message: { content: "{}" } }],
    })) as typeof fetch);
  await assert.rejects(malformed.analyze(transcript), { code: "invalid_analysis" });
});
test("durable private recording workflow and spending ledger", async (t) => {
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
  try {
    await migrate(pool);
    await migrate(pool);
    const auth = createAuthentication({
      pool,
      origin: "http://localhost:3002",
      secret: randomBytes(32).toString("hex"),
    });
    async function owner(email: string): Promise<Owner> {
      const password = randomBytes(24).toString("base64url");
      await seedDemo(pool, email, password);
      const r = await auth.api.signInEmail({ body: { email, password } });
      return {
        userId: r.user.id,
        sessionId: (
          await pool.query(
            'SELECT id FROM session WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 1',
            [r.user.id],
          )
        ).rows[0].id,
        demo: false,
      };
    }
    const a = await owner("recording-a@example.test"),
      b = await owner("recording-b@example.test");
    await ensureWorkspace(pool, a);
    await ensureWorkspace(pool, b);
    const input = {
      requestKey: randomUUID(),
      title: "Test meeting",
      filename: "test.wav",
      size: wav.length,
      mime: "audio/wav",
      duration: 106.1,
    };
    let job = await createRecording(pool, a, input);
    assert.equal((await createRecording(pool, a, input)).id, job.id);
    await assert.rejects(createRecording(pool, { ...a, demo: true }, input), {
      code: "private_account_required",
    });
    assert.equal(await getRecording(pool, b, job.id), null);
    assert.equal(await getRecording(pool, { ...a, userId: b.userId }, job.id), null);
    job = (await completeRecording(pool, a, job.id, async () => wav))!;
    assert.equal(job.status, "uploaded");
    const duplicate = await createRecording(pool, a, { ...input, requestKey: randomUUID() });
    assert.equal((await completeRecording(pool, a, duplicate.id, async () => wav))!.id, job.id);
    let transcriptions = 0,
      analyses = 0;
    let release!: () => void, started!: () => void;
    const startedPromise = new Promise<void>((r) => {
        started = r;
      }),
      gate = new Promise<void>((r) => {
        release = r;
      });
    const provider: AIProvider = {
      async transcribe() {
        transcriptions++;
        started();
        await gate;
        return transcript;
      },
      async analyze() {
        analyses++;
        if (analyses === 1) throw new ProcessingError("invalid_analysis", true);
        return analysis;
      },
    };
    await assert.rejects(
      processRecording(pool, a, job.id, provider, async () => wav, { approved: false }),
      { code: "spending_approval_required" },
    );
    assert.equal(
      (await processRecording(pool, a, job.id, provider, async () => wav, { approved: true }))
        .status,
      "queued",
    );
    const first = processRecording(pool, a, job.id, provider, async () => wav, { approved: true });
    await startedPromise;
    assert.equal(
      (await processRecording(pool, a, job.id, provider, async () => wav, { approved: true }))
        .status,
      "transcribing",
    );
    release();
    assert.equal((await first).status, "generating_insights");
    assert.equal(transcriptions, 1);
    assert.equal(
      (await processRecording(pool, a, job.id, provider, async () => wav, { approved: true }))
        .status,
      "failed",
    );
    await assert.rejects(
      processRecording(pool, a, job.id, provider, async () => wav, { approved: true }),
      { code: "retry_approval_required" },
    );
    const ready = await processRecording(pool, a, job.id, provider, async () => wav, {
      approved: true,
      retryApproved: true,
    });
    assert.equal(ready.status, "ready");
    assert.equal(transcriptions, 1);
    assert.equal(analyses, 2);
    await processRecording(pool, a, job.id, provider, async () => wav, { approved: false });
    assert.equal(analyses, 2);
    const meeting = await getOwnedMeeting(pool, a, job.id);
    assert(meeting);
    assert.equal(meeting.meeting.source, "upload");
    assert.deepEqual(ready.transcript!.segments, transcript.segments);
    assert.deepEqual(meeting.meeting.segments, transcript.segments);
    assert.equal(
      transcriptCoverage(meeting.meeting.segments, meeting.meeting.duration).lastEnd,
      106,
    );
    assert.equal(
      formatTranscript(meeting.meeting),
      formatTranscript({
        segments: transcript.segments,
        participants: transcript.speakers,
        highlights: meeting.meeting.highlights,
      }),
    );
    assert.deepEqual(meeting.meeting.participants, transcript.speakers);
    assert.deepEqual(meeting.state.highlights, meeting.meeting.highlights);
    assert.equal(meeting.state.highlights.length, analysis.highlights.length);
    assert.equal(meeting.state.actions.length, 1);
    assert.equal(meeting.state.actions[0].assigneeName, "Alex");
    assert.equal(await getOwnedMeeting(pool, b, job.id), null);
    await t.test("budget reservation is durable, global and idempotent", async () => {
      await pool.query(
        "INSERT INTO sounding_ai_budget(scope,approved_recording_id,authorized_cents) VALUES('module1',$1,100)",
        [job.id],
      );
      await reserveAIRequest(pool, job.id, "transcription", "gpt-4o-transcribe-diarize");
      await reserveAIRequest(pool, job.id, "analysis", "gpt-4o-mini");
      await assert.rejects(reserveAIRequest(pool, job.id, "analysis", "gpt-4o-mini"), {
        code: "billable_request_already_reserved",
      });
      await pool.query(
        "UPDATE sounding_ai_budget SET reserved_cents=90,approved_recording_id=$1 WHERE scope='module1'",
        [duplicate.id],
      );
      await assert.rejects(reserveAIRequest(pool, duplicate.id, "transcription", "whisper-1"), {
        code: "spending_approval_required",
      });
    });
    const final = await createRecording(pool, a, { ...input, requestKey: randomUUID() });
    await assert.rejects(createRecording(pool, a, { ...input, requestKey: randomUUID() }), {
      code: "user_upload_limit",
    });
    await pool.query(
      "UPDATE sounding_recording SET status='transcribing',lease_until=now()-interval '1 minute' WHERE id=$1",
      [final.id],
    );
    assert.equal(
      (await processRecording(pool, a, final.id, provider, async () => wav, { approved: true }))
        .error_code,
      "provider_request_uncertain",
    );
    assert.equal(transcriptions, 1);
    await cancelRecording(pool, a, job.id);
    assert.equal(await getRecording(pool, a, job.id), null);
    assert.equal(await getOwnedMeeting(pool, a, job.id), null);
  } finally {
    await pool.end();
    await server.stop();
    await db.close();
  }
});
