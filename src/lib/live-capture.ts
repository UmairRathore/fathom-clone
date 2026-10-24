import { formatTime, type Highlight, type Category } from "./domain";

export const liveCategories = [
  "Highlight",
  "Positive Reaction",
  "Needs Review",
  "Feedback",
] as const;
/** Monotonic elapsed time; no dependence on timer callback frequency or wall-clock changes. */
export function replayTime(
  offset: number,
  startedAt: number,
  now: number,
  speed: number,
  duration: number,
) {
  return Math.min(duration, Math.max(0, offset + (Math.max(0, now - startedAt) / 1000) * speed));
}
export function liveAnnotation(input: {
  id: string;
  sessionId: string;
  time: number;
  duration: number;
  category: Category;
  note: string;
}): Highlight {
  if (
    !Number.isFinite(input.time) ||
    input.time < 0 ||
    input.time >= input.duration ||
    !liveCategories.some((c) => c === input.category)
  )
    throw new Error("Invalid live annotation.");
  return {
    id: input.id,
    captureSessionId: input.sessionId,
    origin: "manual",
    title: `Live ${input.category} · ${formatTime(input.time)}`,
    time: input.time,
    end: Math.min(input.duration, input.time + 10),
    category: input.category,
    description: input.note.trim().slice(0, 600),
  };
}
export function appendLiveAnnotation(current: Highlight[], next: Highlight) {
  if (
    current.length >= 200 ||
    current.some(
      (h) =>
        h.id === next.id ||
        (h.captureSessionId === next.captureSessionId &&
          h.category === next.category &&
          h.description === next.description &&
          Math.abs(h.time - next.time) < 0.25),
    )
  )
    return current;
  return [...current, next].sort((a, b) => a.time - b.time);
}
