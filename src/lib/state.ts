import { z } from "zod";
import { categories, type Meeting } from "./domain";
import { clipSchema, captureSchema, validClip } from "./journey";
export const actionSchema = z.object({
  id: z.string().min(1).max(100),
  text: z
    .string()
    .trim()
    .min(1, "Add a description")
    .max(300, "Keep action items under 300 characters"),
  time: z.number().finite().nonnegative(),
  done: z.boolean(),
  assignee: z.string().optional(),
  assigneeName: z.string().max(120).nullable().optional(),
  dueDate: z.string().max(120).nullable().optional(),
  description: z.string().max(600).optional(),
  sourceSegmentId: z.string().max(100).optional(),
});
export const highlightSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1, "Add a title").max(120),
  time: z.number().finite().nonnegative(),
  end: z.number().finite().positive(),
  category: z.enum(categories),
  description: z.string().max(600),
});
export const preferencesSchema = z.object({
  template: z.enum(["Enhanced", "Project Update"]),
  length: z.enum(["standard", "concise"]),
  focus: z.enum(["all", "decisions", "actions"]),
  guidance: z.string().max(1024),
});
export const stateSchema = z.object({
  version: z.literal(1),
  clips: z.array(clipSchema).max(100).optional(),
  capture: captureSchema.optional(),
  actions: z.array(actionSchema).max(200),
  highlights: z.array(highlightSchema).max(200),
  preferences: preferencesSchema,
  sharing: z.enum(["unlisted", "restricted"]).default("unlisted"),
});
export type MeetingState = z.infer<typeof stateSchema>;
export type SummaryPreferences = z.infer<typeof preferencesSchema>;
export function defaultState(meeting: Meeting): MeetingState {
  return {
    version: 1,
    sharing: "unlisted",
    actions: meeting.actions,
    highlights: meeting.highlights,
    preferences: { template: "Enhanced", length: "standard", focus: "all", guidance: "" },
  };
}
export function restoreState(raw: string, meeting: Meeting): MeetingState {
  try {
    const parsed = stateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return defaultState(meeting);
    const state = parsed.data;
    if (
      state.clips?.some((clip) => !validClip(clip, meeting)) ||
      (state.capture &&
        (state.capture.elapsed > meeting.duration ||
          (["processing", "ready"].includes(state.capture.stage) &&
            state.capture.elapsed !== meeting.duration) ||
          (["connected", "scheduled"].includes(state.capture.stage) &&
            state.capture.elapsed !== 0))) ||
      state.actions.some(
        (a) =>
          a.time >= meeting.duration ||
          (a.assignee && !meeting.participants.some((p) => p.id === a.assignee)),
      ) ||
      state.highlights.some(
        (h) => h.time >= meeting.duration || h.end > meeting.duration || h.end <= h.time,
      )
    )
      return defaultState(meeting);
    return state;
  } catch {
    return defaultState(meeting);
  }
}
