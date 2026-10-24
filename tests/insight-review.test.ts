import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTranscription,
  validateEvidence,
  createOpenAIProvider,
} from "../src/lib/recordings/ai";
import { reviewInsights } from "../src/lib/recordings/review";
import { processedMeeting } from "../src/lib/recordings/meeting";
import type { Analysis } from "../src/lib/recordings/schema";
import { stateSchema } from "../src/lib/state";
const transcript = parseTranscription(
  {
    segments: [
      {
        start: 1.125,
        end: 5.25,
        text: "Our action is for Alice to finalize the schema by Monday.",
        speaker: "A",
      },
      { start: 6.5, end: 10.75, text: "Ben will complete the interface by Tuesday.", speaker: "A" },
      { start: 11.1, end: 15.4, text: "I will implement the summary by Wednesday.", speaker: "A" },
      {
        start: 16.2,
        end: 20.8,
        text: "Chris will prepare the environment by Thursday.",
        speaker: "A",
      },
      { start: 21.4, end: 25.5, text: "We decided to keep recordings private.", speaker: "A" },
    ],
  },
  "gpt-4o-transcribe-diarize",
  30,
);
const source = (i: number) => ({
  segmentId: transcript.segments[i].id,
  quote: transcript.segments[i].text,
});
const analysis: Analysis = {
  purpose: null,
  executiveSummary: [],
  takeaways: [],
  topics: [],
  decisions: [{ text: "Keep recordings private.", sources: [source(4)] }],
  risks: [],
  openQuestions: [],
  nextSteps: [{ text: "Complete the interface.", sources: [source(1)] }],
  actions: [0, 1, 2, 3].map((i) => ({
    title: `Task ${i + 1}`,
    description: "",
    assignee: null,
    dueDate: null,
    source: source(i),
  })),
  highlights: [],
};
test("review recovers only explicitly cited assignment details, leaves identities anonymous and originals immutable", () => {
  const before = JSON.stringify({ transcript, analysis });
  const review = reviewInsights(transcript, analysis);
  assert.deepEqual(
    review.actions.map((a) => a.assignee),
    ["Alice", "Ben", null, "Chris"],
  );
  assert.deepEqual(
    review.actions.map((a) => a.dueDate),
    ["Monday", "Tuesday", "Wednesday", "Thursday"],
  );
  assert.equal(review.actions[2].selfAssigned, true);
  assert.equal(review.audioVerified, false);
  assert.equal(JSON.stringify({ transcript, analysis }), before);
  assert.deepEqual(
    review.actions.map((a) => a.time),
    transcript.segments.slice(0, 4).map((s) => s.start),
  );
});
test("review preserves original details and never borrows an owner or deadline from unrelated speech", () => {
  const clone = structuredClone(analysis);
  clone.actions = [
    { ...clone.actions[0], assignee: "Alice", dueDate: "Monday" },
    { ...clone.actions[0], source: source(4) },
  ];
  const r = reviewInsights(transcript, clone);
  assert.equal(r.actions[0].changed, false);
  assert.equal(r.actions[1].assignee, null);
  assert.equal(r.actions[1].dueDate, null);
});
test("summary links use each bullet's own source and suggestions deduplicate without replacing highlights", () => {
  const clone = structuredClone(analysis);
  clone.nextSteps.push({ text: "Prepare environment.", sources: [source(3)] });
  clone.highlights = [{ title: "Existing", description: "Keep it", source: source(4) }];
  const r = reviewInsights(transcript, clone);
  const section = r.summaries.Enhanced.find((s) => s.title === "Next Steps")!;
  assert.deepEqual(section.bulletTimes, [6.5, 16.2]);
  assert(!r.highlights.some((h) => h.sourceSegmentId === "segment-5"));
  assert.equal(clone.highlights.length, 1);
  assert(r.highlights.every((h) => h.origin === "review" && h.end > h.time));
  const meeting = processedMeeting(
    {
      id: "fictional",
      title: "Fixture",
      created_at: new Date(0),
      media_duration: 30,
      media_type: "audio",
    },
    transcript,
    clone,
  );
  assert.equal(meeting.highlights[0].origin, "automatic");
  const legacy = {
    version: 1,
    actions: [],
    highlights: [
      { id: "old", title: "Old", time: 1, end: 2, category: "Highlight", description: "" },
    ],
    preferences: { template: "Enhanced", length: "standard", focus: "all", guidance: "" },
  };
  assert(stateSchema.safeParse(legacy).success);
});
test("action validation requires complete words, not a name hidden in another word", () => {
  const clone = structuredClone(analysis);
  clone.actions[0].assignee = "Ali";
  assert.throws(() => validateEvidence(clone, transcript), /unsupported_action_detail/);
});
test("optional language hint is sent only when valid; no unsupported diarization vocabulary prompt", async () => {
  const old = process.env.TRANSCRIPTION_LANGUAGE;
  process.env.TRANSCRIPTION_LANGUAGE = "en";
  try {
    let calls = 0;
    const provider = createOpenAIProvider("fixture", async (_url, options) => {
      calls++;
      const body = options!.body as FormData;
      assert.equal(body.get("language"), "en");
      assert.equal(body.get("prompt"), null);
      assert.equal(body.get("chunking_strategy"), "auto");
      return Response.json({
        segments: [{ start: 0, end: 1, text: "Fixture speech", speaker: "A" }],
      });
    });
    await provider.transcribe(new Uint8Array([1]), "fixture.wav", "audio/wav", 2);
    process.env.TRANSCRIPTION_LANGUAGE = "invalid";
    await assert.rejects(
      () => provider.transcribe(new Uint8Array([1]), "fixture.wav", "audio/wav", 2),
      /transcription_language_invalid/,
    );
    assert.equal(calls, 1);
  } finally {
    if (old === undefined) delete process.env.TRANSCRIPTION_LANGUAGE;
    else process.env.TRANSCRIPTION_LANGUAGE = old;
  }
});

test("additional topic passages are exact source text with original fractional times", () => {
  const r = reviewInsights(transcript, analysis);
  assert(r.evidenceNotes.length > 0);
  for (const note of r.evidenceNotes) {
    const original = transcript.segments.find((s) => s.id === note.sourceSegmentId)!;
    assert.equal(note.quote, original.text);
    assert.equal(note.time, original.start);
    assert.equal(note.end, original.end);
  }
});
