import test from "node:test";
import assert from "node:assert/strict";
import {
  groupTranscript,
  formatTranscript,
  transcriptCoverage,
  segmentHighlights,
} from "../src/lib/transcript";
import { parseTranscription } from "../src/lib/recordings/ai";
import type { Highlight, Participant, Segment } from "../src/lib/domain";
const speakers: Participant[] = [
  {
    id: "speaker-1",
    name: "Speaker 1",
    role: "Diarized voice · identity unverified",
    color: "#123456",
  },
];
const segments: Segment[] = Array.from({ length: 56 }, (_, i) => ({
  id: `s-${i}`,
  speakerId: "speaker-1",
  start: 5.172 + i * 4.6,
  end: 8.5 + i * 4.6,
  text: `Sample phrase ${i}.`,
}));
const highlight: Highlight = {
  id: "h-1",
  title: "Saved highlight",
  description: "Test",
  time: segments[20].start + 0.25,
  end: segments[21].end,
  category: "Highlight",
};
test("readable paragraphs retain all source words, IDs, fractional timestamps and duration coverage", () => {
  const before = JSON.stringify(segments);
  const groups = groupTranscript(segments, [highlight]);
  assert(groups.length < segments.length / 2);
  assert.deepEqual(
    groups.flatMap((p) => p.segments),
    segments,
  );
  assert.equal(groups[0].start, 5.172);
  assert.equal(groups.at(-1)!.end, segments.at(-1)!.end);
  assert.equal(JSON.stringify(segments), before);
  assert.equal(transcriptCoverage(segments, 267.833).count, 56);
  for (const minute of [0, 1, 2, 3, 4])
    assert(segments.some((s) => s.start >= minute * 60 && s.start < (minute + 1) * 60));
});
test("paragraphs respect distinct speakers, unknown attribution, pauses, bounds and source highlight ranges", () => {
  const speech: Segment[] = [
    { id: "a", start: 1, end: 2, text: "First clause", speakerId: "u" },
    { id: "b", start: 2, end: 3, text: "continues.", speakerId: "u" },
    { id: "c", start: 3, end: 4, text: "Different voice.", speakerId: "v" },
    { id: "d", start: 10, end: 12, text: "After pause.", speakerId: "v" },
  ];
  assert.deepEqual(
    groupTranscript(speech).map((p) => p.segments.length),
    [2, 1, 1],
  );
  assert(formatTranscript({ segments: speech, participants: [] }).includes("Unknown speaker"));
  const groups = groupTranscript(segments, [highlight]);
  assert.equal(new Set(groups.flatMap((g) => g.highlights.map((h) => h.id))).size, 1);
  assert.equal(segmentHighlights(segments[20], [highlight]).length, 1);
  assert.equal(segmentHighlights(segments[21], [highlight]).length, 1);
  assert.equal(segmentHighlights(segments[19], [highlight]).length, 0);
  assert.equal(groups.flatMap((g) => g.segments).length, 56);
  assert.equal(highlight.time, segments[20].start + 0.25);
});
test("copy formatting covers beginning, middle and end exactly once without UI tools or view filters", () => {
  const output = formatTranscript({ segments, participants: speakers, highlights: [highlight] });
  const speech = output
    .split("\n\n")
    .map((p) => p.split("\n").slice(1).join("\n"))
    .join(" ");
  assert.equal(speech, segments.map((s) => s.text).join(" "));
  assert(output.startsWith("[0:05–"));
  assert(output.includes(segments[28].text));
  assert(output.endsWith(segments[55].text));
  assert(!output.includes("svg"));
  assert(!output.includes("Action item"));
  assert(!output.includes("undefined"));
});
test("normalization sorts full-duration second timestamps and rejects millisecond units or invalid bounds", () => {
  const raw = {
    segments: [
      { start: 260.125, end: 265.875, text: "Final sentence.", speaker: "A" },
      { start: 5.172, end: 10.5, text: "Opening sentence.", speaker: "A" },
      { start: 120.25, end: 125.75, text: "Middle sentence.", speaker: "B" },
    ],
  };
  const t = parseTranscription(raw, "gpt-4o-transcribe-diarize", 267.833);
  assert.deepEqual(
    t.segments.map((s) => s.start),
    [5.172, 120.25, 260.125],
  );
  assert.equal(t.segments.at(-1)!.end, 265.875);
  assert.equal(t.segments.length, 3);
  assert.deepEqual(transcriptCoverage(t.segments, 267.833), {
    count: 3,
    firstStart: 5.172,
    lastEnd: 265.875,
    ordered: true,
    boundsValid: true,
  });
  assert.throws(
    () =>
      parseTranscription(
        { segments: [{ start: 5000, end: 10000, text: "Bad units." }] },
        "whisper-1",
        267.833,
      ),
    { code: "invalid_timestamps" },
  );
  assert.equal(transcriptCoverage([...t.segments].reverse(), 267.833).ordered, false);
  assert.equal(transcriptCoverage([{ ...segments[0], end: 300 }], 267.833).boundsValid, false);
});
test("actual provider voice labels stay distinct; missing labels and whisper never imply diarization", () => {
  const raw = {
    segments: [
      { start: 1, end: 2, text: "Anonymous voice.", speaker: "A" },
      { start: 3, end: 4, text: "Same voice.", speaker: "A" },
      { start: 5, end: 6, text: "Unattributed.", speaker: "   " },
    ],
  };
  const t = parseTranscription(raw, "gpt-4o-transcribe-diarize", 10);
  assert.equal(t.speakers.length, 2);
  assert.equal(t.segments[0].speakerId, t.segments[1].speakerId);
  assert.notEqual(t.segments[1].speakerId, t.segments[2].speakerId);
  assert.equal(t.speakers[0].name, "Speaker 1");
  assert.equal(t.speakers[1].name, "Unknown speaker");
  assert.equal(t.speakers[1].role, "Attribution unavailable");
  const whisper = parseTranscription(raw, "whisper-1", 10);
  assert.equal(whisper.speakers.length, 1);
  assert.equal(whisper.speakers[0].name, "Unknown speaker");
});
