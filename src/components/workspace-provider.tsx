"use client";
import { createContext, useContext, useState, useRef, useEffect } from "react";
import type { SavedMeeting } from "@/lib/workspace-store";
import type { MeetingState } from "@/lib/state";
type Profile = {
  name: string;
  email: string;
  demo: boolean;
  canResetPassword: boolean;
  expiresAt: string;
};
type Workspace = {
  saved: SavedMeeting[];
  profile: Profile;
  pending: number;
  whenSaved: (id: string) => Promise<boolean>;
  error: string;
  update: (id: string, updater: (state: MeetingState) => MeetingState) => boolean;
};
const Context = createContext<Workspace | null>(null);
export function useWorkspace() {
  return useContext(Context);
}
export function WorkspaceProvider({
  saved: initial,
  profile,
  children,
}: {
  saved: SavedMeeting[];
  profile: Profile;
  children: React.ReactNode;
}) {
  const [saved, setSaved] = useState(initial),
    [pending, setPending] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    const expired = () => window.location.replace("/users/sign_in?reason=session");
    const timer = window.setTimeout(
      expired,
      Math.max(0, new Date(profile.expiresAt).getTime() - Date.now()),
    );
    const verify = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/auth/get-session", { cache: "no-store" });
        if (response.ok && !(await response.json())?.session) expired();
      } catch {
        /* A temporary network failure does not erase already loaded content. */
      }
    };
    window.addEventListener("pageshow", verify);
    document.addEventListener("visibilitychange", verify);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pageshow", verify);
      document.removeEventListener("visibilitychange", verify);
    };
  }, [profile.expiresAt]);
  const current = useRef(initial),
    confirmed = useRef(initial);
  const queues = useRef(new Map<string, Promise<void>>());
  const failed = useRef(false);
  function update(id: string, updater: (state: MeetingState) => MeetingState) {
    if (failed.current) return false;
    const item = current.current.find((x) => x.meeting.id === id);
    if (!item) return false;
    const state = updater(item.state);
    current.current = current.current.map((x) => (x.meeting.id === id ? { ...x, state } : x));
    setSaved(current.current);
    setPending((n) => n + 1);
    const next = (queues.current.get(id) ?? Promise.resolve())
      .then(async () => {
        if (failed.current) return;
        const revision = confirmed.current.find((x) => x.meeting.id === id)!.revision;
        try {
          const response = await fetch(`/api/meetings/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state, revision }),
          });
          if (response.status === 401) {
            window.location.replace("/users/sign_in?reason=session");
            throw new Error();
          }
          if (!response.ok) throw new Error();
          const result = await response.json();
          confirmed.current = confirmed.current.map((x) =>
            x.meeting.id === id ? { ...x, state, revision: result.revision } : x,
          );
        } catch {
          failed.current = true;
          current.current = confirmed.current;
          setSaved(confirmed.current);
          setError("Changes could not be saved. Reload to reconnect before editing.");
        }
      })
      .finally(() => setPending((n) => n - 1));
    queues.current.set(id, next);
    return true;
  }
  return (
    <Context.Provider
      value={{
        saved,
        profile,
        pending,
        error,
        update,
        whenSaved: async (id) => {
          await queues.current.get(id);
          return !failed.current;
        },
      }}
    >
      {error && (
        <div className="workspace-save-error" role="alert">
          {error} <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}
      <div className="save-indicator" role="status" aria-live="polite">
        {pending ? "Saving changes…" : error ? "Changes not saved" : "All changes saved"}
      </div>
      {children}
    </Context.Provider>
  );
}
