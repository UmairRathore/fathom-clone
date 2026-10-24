"use client";
import { useEffect, useState } from "react";
import type { Clip } from "@/lib/journey";
import type { Meeting } from "@/lib/domain";
import { formatTime } from "@/lib/domain";
type Grant = { clipId: string; active: boolean; expiresAt: number };
export function ClipLibrary({
  meeting,
  clips,
  version,
  create,
  edit,
  share,
  remove,
  notify,
}: {
  meeting: Meeting;
  clips: Clip[];
  version: number;
  create: () => void;
  edit: (clip: Clip) => void;
  share: (clip: Clip) => void;
  remove: (clip: Clip) => Promise<void>;
  notify: (text: string) => void;
}) {
  const [grants, setGrants] = useState<Grant[]>([]),
    [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState(false);
  const clipKey = JSON.stringify(clips);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shares?meetingId=${encodeURIComponent(meeting.id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) {
          setGrants(data.shares);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGrants([]);
          setLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [meeting.id, clipKey, version]);
  async function revoke(clip: Clip) {
    const response = await fetch("/api/shares", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId: meeting.id, clipId: clip.id }),
    });
    if (!response.ok) throw new Error();
    setGrants((current) =>
      current.map((g) => (g.clipId === clip.id ? { ...g, active: false } : g)),
    );
  }
  return (
    <section className="sidebar-section" aria-label="Meeting clips">
      <div className="section-label">
        <h2>CLIPS</h2>
        <button aria-label="Create clip" disabled={clips.length >= 100} onClick={create}>
          + Create
        </button>
      </div>
      {loadError && <p role="alert">Could not check sharing status. Reload to reconnect.</p>}
      {!clips.length && <p>Save a moment, preview it, and share only that excerpt.</p>}
      {clips.map((clip) => {
        const active = grants.find((g) => g.clipId === clip.id)?.active;
        return (
          <article className="saved-clip" key={clip.id}>
            <strong>{clip.title}</strong>
            <small>
              {meeting.title} · {(clip.end - clip.start).toFixed(2)}s · {formatTime(clip.start)}–
              {formatTime(clip.end)}
            </small>
            <span className="clip-link-status">
              {loadError
                ? "Link status unavailable"
                : active
                  ? "External link active"
                  : "No active external link"}
            </span>
            <div className="clip-library-actions">
              <button disabled={!!busy} onClick={() => edit(clip)}>
                Preview / adjust
              </button>
              <button disabled={!!busy} onClick={() => share(clip)}>
                Copy link / share
              </button>
              <button
                disabled={!!busy || !active}
                onClick={async () => {
                  setBusy(clip.id);
                  try {
                    await revoke(clip);
                    notify("External link revoked. New requests are denied immediately.");
                  } catch {
                    notify("Could not revoke the link. Try again.");
                  } finally {
                    setBusy("");
                  }
                }}
              >
                Revoke link
              </button>
              <button
                disabled={!!busy}
                onClick={async () => {
                  setBusy(clip.id);
                  try {
                    await revoke(clip);
                    await remove(clip);
                    notify("Clip deleted and sharing disabled.");
                  } catch {
                    notify("Could not delete the clip. Reload and try again.");
                  } finally {
                    setBusy("");
                  }
                }}
              >
                Delete clip
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
