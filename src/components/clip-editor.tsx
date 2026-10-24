"use client";
import { useRef, useState } from "react";
import { Modal } from "./modal";
import type { Meeting } from "@/lib/domain";
import { clipSchema, validClip, type Clip } from "@/lib/journey";
export function ClipEditor({
  meeting,
  start,
  end,
  close,
  save,
}: {
  meeting: Meeting;
  start: number;
  end: number;
  close: () => void;
  save: (clip: Clip) => void;
}) {
  const [title, setTitle] = useState("Meeting moment");
  const [from, setFrom] = useState(String(start));
  const [to, setTo] = useState(String(end));
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  function value() {
    const parsed = clipSchema.safeParse({
      id: crypto.randomUUID(),
      title,
      start: from.trim() ? Number(from) : NaN,
      end: to.trim() ? Number(to) : NaN,
    });
    if (!parsed.success || !validClip(parsed.data, meeting)) {
      setError(
        `Choose a title and a range between 0 and ${meeting.duration.toFixed(1)} seconds, with end after start.`,
      );
      return null;
    }
    setError("");
    return parsed.data;
  }
  return (
    <Modal title="Create clip" close={close}>
      <p className="modal-description">
        Select the moment to save and share.{" "}
        {meeting.mediaUrl
          ? "Preview uses the synthesized demo recording."
          : "Transcript excerpt only; this meeting has no recording."}
      </p>
      <label>
        Clip title
        <input
          aria-label="Clip title"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className="journey-controls">
        <label>
          Start (seconds)
          <input
            aria-label="Clip start seconds"
            type="number"
            min={0}
            max={meeting.duration}
            step="0.1"
            value={from}
            onChange={(e) => {
              audio.current?.pause();
              setFrom(e.target.value);
            }}
          />
        </label>
        <label>
          End (seconds)
          <input
            aria-label="Clip end seconds"
            type="number"
            min={0}
            max={meeting.duration}
            step="0.1"
            value={to}
            onChange={(e) => {
              audio.current?.pause();
              setTo(e.target.value);
            }}
          />
        </label>
      </div>
      {meeting.mediaUrl && (
        <>
          <audio
            ref={audio}
            src={meeting.mediaUrl}
            preload="metadata"
            onTimeUpdate={(e) => {
              if (e.currentTarget.currentTime >= Number(to)) e.currentTarget.pause();
            }}
          />
          <button
            className="secondary-button"
            onClick={async () => {
              const clip = value();
              if (!clip || !audio.current) return;
              try {
                audio.current.currentTime = clip.start;
                await audio.current.play();
              } catch {
                setError(
                  "Audio unavailable. Retry preview or save the clip to read its transcript.",
                );
              }
            }}
          >
            Preview selected audio
          </button>
        </>
      )}
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
          onClick={() => {
            const clip = value();
            if (clip) save(clip);
          }}
        >
          Save clip
        </button>
      </div>
    </Modal>
  );
}
