import type { Analysis, Transcription } from "./schema";
import { validateEvidence } from "./ai";
import { processedMeeting } from "./meeting";

/** A reversible, deterministic view of existing evidence. Never edits the stored AI result. */
export function reviewInsights(transcript: Transcription, original: Analysis) {
  const analysis = structuredClone(validateEvidence(original, transcript));
  const actions = analysis.actions.map((action, index) => {
    const segment = transcript.segments.find((s) => s.id === action.source.segmentId)!;
    // Only explicit assignment grammar in this action's cited utterance. No attendee inference.
    const named =
      segment.text.match(/\bfor ([A-Z][\p{L}'’-]*(?: [A-Z][\p{L}'’-]*){0,2}) to\b/u) ??
      segment.text.match(/\b([A-Z][\p{L}'’-]*(?: [A-Z][\p{L}'’-]*){0,2}) will\b/u);
    const self = /\bI will\b/.test(segment.text);
    const owner = named?.[1] === "I" ? null : (named?.[1] ?? null);
    const deadline =
      segment.text.match(
        /\bby (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i,
      )?.[1] ?? null;
    const assignee = action.assignee ?? owner;
    const dueDate = action.dueDate ?? deadline;
    return {
      id: `action-${index + 1}`,
      title: action.title,
      originalAssignee: action.assignee,
      originalDueDate: action.dueDate,
      assignee,
      dueDate,
      selfAssigned: !assignee && self,
      changed: assignee !== action.assignee || dueDate !== action.dueDate,
      sourceSegmentId: segment.id,
      time: segment.start,
      quote: segment.text,
    };
  });
  const groups = [
    ["Decision", analysis.decisions],
    ["Risk", analysis.risks],
    ["Next step", analysis.nextSteps],
    ["Purpose", analysis.purpose ? [analysis.purpose] : []],
  ] as const;
  const seen = new Set(analysis.highlights.map((h) => h.source.segmentId));
  const highlights = groups.flatMap(([kind, points]) =>
    points.flatMap((point) => {
      const source = point.sources[0];
      if (seen.has(source.segmentId)) return [];
      seen.add(source.segmentId);
      const segment = transcript.segments.find((s) => s.id === source.segmentId)!;
      return [
        {
          id: `review-${segment.id}`,
          title: kind,
          description: point.text,
          quote: source.quote,
          sourceSegmentId: segment.id,
          time: segment.start,
          end: segment.end,
          category: "Highlight" as const,
          origin: "review" as const,
        },
      ];
    }),
  );
  // Verbatim source passages expose details an abbreviated AI summary may omit.
  // Topic labels are navigation aids, not new generated assertions.
  const topics = [
    ["Platform and features", /\b(?:platform|searchable|summaries|actionable|MeetingFlow)\b/i],
    ["Technology", /\b(?:next\.?\s*js|postgres|prisma|typescript|tailwind|frontend|database)\b/i],
    ["Privacy", /\b(?:privacy|authorized|public sharing|share link)\b/i],
    ["Performance", /\b(?:performance|virtualized|long meetings)\b/i],
    ["Milestones", /\b(?:release|check.in|Wednesday|Thursday|Friday)\b/i],
  ] as const;
  const evidenceNotes = topics.flatMap(([topic, pattern]) =>
    transcript.segments
      .filter((segment) => pattern.test(segment.text))
      .slice(0, 3)
      .map((segment) => ({
        topic,
        quote: segment.text,
        time: segment.start,
        end: segment.end,
        sourceSegmentId: segment.id,
      })),
  );
  const summaries = processedMeeting(
    {
      id: "review",
      title: "Review",
      created_at: new Date(0),
      media_duration: transcript.segments.at(-1)!.end,
      media_type: "audio",
    },
    transcript,
    analysis,
  ).summaries;
  return {
    version: 1 as const,
    basis: "saved-transcript" as const,
    audioVerified: false as const,
    actions,
    evidenceNotes,
    highlights,
    summaries,
  };
}
export type InsightReview = ReturnType<typeof reviewInsights>;
