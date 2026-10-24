import { formatTime, type Highlight, type Participant, type Segment } from "./domain";
export type TranscriptParagraph = {
  id: string;
  speakerId: string;
  start: number;
  end: number;
  segments: Segment[];
  highlights: Highlight[];
};
export function segmentHighlights(segment: Segment, highlights: Highlight[]) {
  return highlights.filter((h) =>
    h.end > h.time
      ? h.time < segment.end && h.end > segment.start
      : h.time >= segment.start && h.time < segment.end,
  );
}
// Presentation only: retain every source object, word and fractional timestamp.
export function groupTranscript(segments: Segment[], highlights: Highlight[] = []) {
  const groups: TranscriptParagraph[] = [];
  for (const segment of segments) {
    const prior = groups.at(-1);
    const last = prior?.segments.at(-1);
    const marks = segmentHighlights(segment, highlights);
    const sameMarks =
      prior?.highlights.map((h) => h.id).join("\0") === marks.map((h) => h.id).join("\0");
    const words = prior?.segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0) ?? 0;
    const sentenceBreak =
      last && /[.!?؟。]["'”’)]?$/.test(last.text) && (last.end - prior!.start >= 15 || words >= 55);
    if (
      prior &&
      last &&
      prior.speakerId === segment.speakerId &&
      segment.start >= last.start &&
      segment.start - last.end <= 2.5 &&
      segment.end - prior.start <= 35 &&
      words + segment.text.split(/\s+/).length <= 95 &&
      sameMarks &&
      !sentenceBreak
    ) {
      prior.segments.push(segment);
      prior.end = Math.max(prior.end, segment.end);
    } else {
      groups.push({
        id: segment.id,
        speakerId: segment.speakerId,
        start: segment.start,
        end: segment.end,
        segments: [segment],
        highlights: marks,
      });
    }
  }
  return groups;
}
export function speakerName(participants: Participant[], speakerId: string) {
  return participants.find((p) => p.id === speakerId)?.name || "Unknown speaker";
}
export function formatTranscript(meeting: {
  segments: Segment[];
  participants: Participant[];
  highlights?: Highlight[];
}) {
  return groupTranscript(meeting.segments, meeting.highlights)
    .map(
      (p) =>
        `[${formatTime(p.start)}–${formatTime(p.end)}] ${speakerName(meeting.participants, p.speakerId)}\n` +
        p.segments.map((s) => s.text).join(" "),
    )
    .join("\n\n");
}
export function transcriptCoverage(segments: Segment[], duration: number) {
  return {
    count: segments.length,
    firstStart: segments.length ? Math.min(...segments.map((s) => s.start)) : null,
    lastEnd: segments.length ? Math.max(...segments.map((s) => s.end)) : null,
    ordered: segments.every((s, i) => !i || s.start >= segments[i - 1].start),
    boundsValid: segments.every(
      (s) =>
        Number.isFinite(s.start) &&
        Number.isFinite(s.end) &&
        s.start >= 0 &&
        s.start < s.end &&
        s.end <= duration,
    ),
  };
}
