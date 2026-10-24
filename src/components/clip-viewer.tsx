"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { Participant, Segment } from "@/lib/domain";
import { formatTime } from "@/lib/domain";
import type { Clip } from "@/lib/journey";
export function ClipViewer({
  title,
  meetingTitle,
  clip,
  participants,
  segments,
  mediaUrl,
}: {
  title: string;
  meetingTitle: string;
  clip: Clip;
  participants: Participant[];
  segments: Segment[];
  mediaUrl?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState(false);
  return (
    <main className="journey-page">
      <Link href="/users/sign_in">Sounding</Link>
      <p className="journey-notice">
        Shared clip · Read-only · Fictional content · Link expires after 24 hours
      </p>
      <h1>{title}</h1>
      <p>
        {meetingTitle} · {formatTime(clip.start)}–{formatTime(clip.end)} ·{" "}
        {formatTime(clip.end - clip.start)}
      </p>
      {mediaUrl ? (
        <>
          <audio
            controls
            preload="metadata"
            aria-label="Shared clip audio"
            ref={audio}
            src={mediaUrl}
            onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
            onError={() => setError(true)}
          />
          <p>
            <a href={mediaUrl} download="sounding-clip.wav">
              Download clip audio
            </a>
          </p>
          {error && (
            <p role="alert">
              Audio could not load. Reload to retry; the selected transcript remains available.
            </p>
          )}
        </>
      ) : (
        <p className="journey-notice">
          Transcript excerpt only · This fixture has no audio or video.
        </p>
      )}
      <section aria-label="Clip transcript">
        {segments.map((s) => (
          <article
            className={`clip-segment ${position + clip.start >= s.start && position + clip.start < s.end ? "is-active" : ""}`}
            key={s.id}
          >
            <button
              disabled={!mediaUrl}
              onClick={() => {
                if (audio.current) audio.current.currentTime = s.start - clip.start;
              }}
            >
              {formatTime(s.start)} · {participants.find((p) => p.id === s.speakerId)?.name}
            </button>
            <p>{s.text}</p>
          </article>
        ))}
      </section>
      <small>
        Only intersecting transcript segments are shown. A boundary segment includes its whole
        utterance. No account is needed; a protected deployment may separately require Vercel
        access.
      </small>
    </main>
  );
}
