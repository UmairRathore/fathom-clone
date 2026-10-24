"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "./modal";
import type { Meeting } from "@/lib/domain";
import { clipSchema, validClip, type Clip } from "@/lib/journey";
export function ClipEditor({
  meeting,
  start,
  end,
  existing,
  close,
  save,
}: {
  meeting: Meeting;
  start: number;
  end: number;
  existing?: Clip;
  close: () => void;
  save: (clip: Clip) => Promise<void>;
}) {
  const [title, setTitle] = useState(existing?.title ?? "Meeting moment");
  const [from, setFrom] = useState(String(start)),
    [to, setTo] = useState(String(end));
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [preview, setPreview] = useState("");
  const audio = useRef<HTMLAudioElement>(null),
    url = useRef(""),
    abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      abort.current?.abort();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  function invalidate() {
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = "";
    setPreview("");
  }
  function value() {
    const parsed = clipSchema.safeParse({
      id: existing?.id ?? crypto.randomUUID(),
      title,
      start: from.trim() ? Number(from) : NaN,
      end: to.trim() ? Number(to) : NaN,
    });
    if (
      !parsed.success ||
      !validClip(parsed.data, meeting) ||
      parsed.data.end - parsed.data.start > 120 ||
      parsed.data.end - parsed.data.start < 0.1 - 1e-9
    ) {
      setError(
        `Choose a title and a 0.1–120 second range within this ${meeting.duration.toFixed(2)} second recording.`,
      );
      return null;
    }
    setError("");
    return parsed.data;
  }
  async function prepare() {
    const clip = value();
    if (!clip) return;
    setBusy("Preparing selected audio…");
    invalidate();
    abort.current = new AbortController();
    try {
      const response = await fetch(
        `/api/meetings/${encodeURIComponent(meeting.id)}/clips/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clip),
          signal: abort.current.signal,
        },
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Preview unavailable.");
      }
      url.current = URL.createObjectURL(await response.blob());
      setPreview(url.current);
    } catch (e) {
      if (!abort.current.signal.aborted)
        setError(e instanceof Error ? e.message : "Preview unavailable.");
    } finally {
      setBusy("");
    }
  }
  const duration = Number(to) - Number(from);
  return (
    <Modal title={existing ? "Preview or adjust clip" : "Create clip"} close={close}>
      <p className="modal-description">
        Select the moment to save and share.{" "}
        {meeting.source === "upload"
          ? "Secure audio excerpt from your recording; video is not exported."
          : meeting.mediaUrl
            ? "Audio from the fictional demo recording."
            : "Transcript-only meeting; no media recording."}
      </p>
      <label>
        Clip title
        <input
          aria-label="Clip title"
          maxLength={120}
          value={title}
          disabled={!!busy}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className="journey-controls">
        <label>
          Start (seconds)
          <input
            aria-label="Clip start seconds"
            type="number"
            min="0"
            max={meeting.duration}
            step="0.001"
            value={from}
            disabled={!!busy}
            onChange={(e) => {
              invalidate();
              setFrom(e.target.value);
            }}
          />
        </label>
        <label>
          End (seconds)
          <input
            aria-label="Clip end seconds"
            type="number"
            min="0"
            max={meeting.duration}
            step="0.001"
            value={to}
            disabled={!!busy}
            onChange={(e) => {
              invalidate();
              setTo(e.target.value);
            }}
          />
        </label>
      </div>
      <p aria-live="polite">
        Selected duration:{" "}
        {Number.isFinite(duration) && duration > 0
          ? `${duration.toFixed(3)} seconds`
          : "Choose valid boundaries"}
      </p>
      {meeting.mediaUrl && (
        <>
          <button className="secondary-button" disabled={!!busy} onClick={prepare}>
            Preview selected audio
          </button>
          {preview && (
            <audio
              controls
              ref={audio}
              src={preview}
              aria-label="Selected clip preview"
              preload="auto"
              onError={() => setError("Audio could not play. Prepare the preview again.")}
            />
          )}
        </>
      )}
      {busy && <p role="status">{busy}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button className="secondary-button" onClick={close}>
          Cancel
        </button>
        <button
          className="primary-button"
          disabled={!!busy}
          onClick={async () => {
            const clip = value();
            if (!clip) return;
            setBusy("Saving clip…");
            try {
              await save(clip);
            } catch {
              setError("Clip could not be saved. Reload to reconnect before trying again.");
            } finally {
              setBusy("");
            }
          }}
        >
          Save clip
        </button>
      </div>
    </Modal>
  );
}
