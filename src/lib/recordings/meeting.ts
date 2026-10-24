import type { Meeting, SummarySection } from "../domain";
import type { Analysis, Transcription } from "./schema";
export function processedMeeting(
  job: {
    id: string;
    title: string;
    created_at: Date | string;
    media_duration: number;
    media_type: "audio" | "video";
  },
  transcript: Transcription,
  analysis: Analysis,
): Meeting {
  const time = (id: string) => transcript.segments.find((s) => s.id === id)!.start;
  const points = (title: string, list: Analysis["takeaways"]): SummarySection[] =>
    list.length
      ? [{ title, bullets: list.map((p) => p.text), time: time(list[0].sources[0].segmentId) }]
      : [];
  const purpose = points("Meeting Purpose", analysis.purpose ? [analysis.purpose] : []);
  const enhanced = [
    ...purpose,
    ...points("Executive Summary", analysis.executiveSummary),
    ...points("Key Takeaways", analysis.takeaways),
    ...points("Discussion Topics", analysis.topics),
    ...points("Decisions", analysis.decisions),
    ...points("Risks & Blockers", analysis.risks),
    ...points("Open Questions", analysis.openQuestions),
    ...points("Next Steps", analysis.nextSteps),
  ];
  const project = [
    ...purpose,
    ...points("Current Status", analysis.executiveSummary),
    ...points("Workstreams", analysis.topics),
    ...points("Decisions & Progress", analysis.decisions),
    ...points("Issues & Blockers", analysis.risks),
    ...points("Open Questions", analysis.openQuestions),
    ...points("Next Steps", analysis.nextSteps),
  ];
  if (!project.length) project.push(...enhanced);
  return {
    id: job.id,
    title: job.title,
    date: new Date(job.created_at).toISOString(),
    duration: job.media_duration,
    participants: transcript.speakers,
    status: "ready",
    kind: "recording",
    source: "upload",
    language: transcript.language,
    mediaType: job.media_type,
    transcriptionModel: transcript.model,
    analysisModel: "gpt-4o-mini",
    mediaUrl: `/api/recordings/${job.id}/media`,
    description:
      "Private uploaded recording · AI-generated insights; review against the original speech.",
    segments: transcript.segments,
    summaries: { Enhanced: enhanced, "Project Update": project },
    actions: analysis.actions.map((a, i) => ({
      id: `action-${i + 1}`,
      text: a.title,
      description: a.description,
      done: false,
      time: time(a.source.segmentId),
      sourceSegmentId: a.source.segmentId,
      assigneeName: a.assignee,
      dueDate: a.dueDate,
    })),
    highlights: analysis.highlights.map((h, i) => {
      const s = transcript.segments.find((s) => s.id === h.source.segmentId)!;
      return {
        id: `highlight-${i + 1}`,
        title: h.title,
        description: h.description,
        time: s.start,
        end: s.end,
        category: "Highlight",
      };
    }),
  };
}
