export type Participant = { id: string; name: string; role: string; color: string };
export type Segment = { id: string; speakerId: string; start: number; end: number; text: string };
export type ActionItem = {
  id: string;
  text: string;
  time: number;
  done: boolean;
  assignee?: string;
  assigneeName?: string | null;
  dueDate?: string | null;
  description?: string;
  sourceSegmentId?: string;
};
export const categories = [
  "Highlight",
  "Positive Reaction",
  "Needs Review",
  "Feedback",
  "Bookmark",
] as const;
export type Category = (typeof categories)[number];
export type Highlight = {
  id: string;
  title: string;
  time: number;
  end: number;
  category: Category;
  description: string;
};
export type SummarySection = {
  title: string;
  bullets: string[];
  time: number;
  bulletTimes?: number[];
};
export type SummaryTemplate = "Enhanced" | "Project Update";
export type Meeting = {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: Participant[];
  status: "ready" | "processing";
  kind: "recording" | "synthetic";
  mediaUrl?: string;
  source?: "upload";
  mediaType?: "audio" | "video";
  transcriptionModel?: string;
  analysisModel?: string;
  language?: string | null;
  description: string;
  segments: Segment[];
  summaries: Record<SummaryTemplate, SummarySection[]>;
  actions: ActionItem[];
  highlights: Highlight[];
};
export function formatTime(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
export function activeSegment(segments: Segment[], time: number): number {
  let low = 0,
    high = segments.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (segments[middle].start <= time + 0.001) low = middle + 1;
    else high = middle - 1;
  }
  return Math.max(0, high);
}
export function searchMeetings(meetings: Meeting[], query: string) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return meetings;
  return meetings.filter((m) => {
    const haystack = [
      m.title,
      ...m.participants.map((p) => p.name),
      ...m.segments.map((s) => s.text),
      ...Object.values(m.summaries).flatMap((sections) =>
        sections.flatMap((s) => [s.title, ...s.bullets]),
      ),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
