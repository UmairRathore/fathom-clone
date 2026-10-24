"use client";
import type { Meeting } from "./domain";
import { defaultState } from "./state";
import { useWorkspace } from "@/components/workspace-provider";
export function useMeetingState(meeting: Meeting, readonly = false) {
  const workspace = useWorkspace();
  const saved = !readonly ? workspace?.saved.find((x) => x.meeting.id === meeting.id) : undefined;
  return {
    state: saved?.state ?? defaultState(meeting),
    whenSaved: async () => (workspace ? workspace.whenSaved(meeting.id) : false),
    update: (updater: Parameters<NonNullable<typeof workspace>["update"]>[1]) =>
      !readonly && workspace ? workspace.update(meeting.id, updater) : false,
  };
}
