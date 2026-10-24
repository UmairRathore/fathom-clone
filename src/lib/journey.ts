import { z } from "zod";
import type { Meeting, Segment } from "./domain";
export const clipSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(120),
  start: z.number().finite().nonnegative(),
  end: z.number().finite().positive(),
});
export type Clip = z.infer<typeof clipSchema>;
export const captureSchema = z.object({
  stage: z.enum(["connected", "scheduled", "recording", "processing", "ready"]),
  elapsed: z.number().finite().nonnegative(),
});
export function validClip(clip: Clip, meeting: Meeting) {
  return (
    Number.isFinite(clip.start) &&
    Number.isFinite(clip.end) &&
    clip.start >= 0 &&
    clip.start < clip.end &&
    clip.end <= meeting.duration
  );
}
export function clipSegments(segments: Segment[], clip: Pick<Clip, "start" | "end">) {
  return segments
    .filter((s) => s.start < clip.end && s.end > clip.start)
    .map((s) => ({
      ...s,
      start: Math.max(s.start, clip.start),
      end: Math.min(s.end, clip.end),
    }));
}
export function parseTimestamp(value: string, duration: number): number | null {
  if (!/^\d{1,3}:[0-5]\d$/.test(value.trim())) return null;
  const [minutes, seconds] = value.trim().split(":").map(Number);
  const time = minutes * 60 + seconds;
  return time <= duration ? time : null;
}
export function captureTransition(
  stage: z.infer<typeof captureSchema>["stage"],
  next: z.infer<typeof captureSchema>["stage"],
) {
  const order = ["connected", "scheduled", "recording", "processing", "ready"];
  return order.indexOf(next) === order.indexOf(stage) + 1;
}
