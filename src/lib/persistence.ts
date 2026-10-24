"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { Meeting } from "./domain";
import { restoreState, type MeetingState } from "./state";
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key);
    else memory.clear();
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
function read(key: string) {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return memory.get(key) ?? "";
  }
}
export function useMeetingState(meeting: Meeting, readonly = false) {
  const key = `sounding:v1:meeting:${meeting.id}`;
  const raw = useSyncExternalStore(
    subscribe,
    () => (readonly ? "" : read(key)),
    () => "",
  );
  const state = useMemo(() => restoreState(raw, meeting), [raw, meeting]);
  function update(updater: (current: MeetingState) => MeetingState): boolean {
    if (readonly) return false;
    const next = updater(restoreState(read(key), meeting));
    const serialized = JSON.stringify(next);
    memory.set(key, serialized);
    let durable = true;
    try {
      window.localStorage.setItem(key, serialized);
    } catch {
      durable = false;
    }
    listeners.forEach((listener) => listener());
    return durable;
  }
  return { state, update };
}
