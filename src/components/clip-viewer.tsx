/* eslint-disable @next/next/no-html-link-for-pages -- Also rendered by the standalone guest server without a Next router. */
"use client";
import { useEffect, useRef, useState } from "react";
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
  statusUrl,
  fictional = true,
  expiresAt,
}: {
  title: string;
  meetingTitle: string;
  clip: Clip;
  participants: Participant[];
  segments: Segment[];
  mediaUrl?: string;
  statusUrl?: string;
  fictional?: boolean;
  expiresAt?: number;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [position, setPosition] = useState(0),
    [error, setError] = useState(false),
    [revoked, setRevoked] = useState(false);
  useEffect(() => {
    if (!statusUrl) return;
    const timer = setInterval(() => {
      fetch(statusUrl, { cache: "no-store" })
        .then((r) => {
          if (r.status === 404) {
            audio.current?.pause();
            setRevoked(true);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [statusUrl]);
  return (
    <main
      className="journey-page clip-public-view"
      data-clip-offset={clip.start}
      data-status-url={statusUrl}
    >
      <a href="/">Sounding</a>
      <p className="journey-notice">
        Shared clip · Read-only{fictional ? " · Fictional demo" : " · Shared by its owner"} ·{" "}
        {expiresAt
          ? `Expires ${new Date(expiresAt).toISOString().slice(0, 16).replace("T", " ")} UTC`
          : "Expires after 24 hours"}
      </p>
      <h1>{title}</h1>
      <p>
        {meetingTitle} · {formatTime(clip.start)}–{formatTime(clip.end)} ·{" "}
        {(clip.end - clip.start).toFixed(3)} seconds
      </p>
      <p role="status" className="clip-access-status">
        {revoked
          ? "This sharing link is no longer available."
          : "Only this selected excerpt is shared."}
      </p>
      {!revoked && mediaUrl ? (
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
            <a className="clip-download" href={mediaUrl} download="sounding-clip.wav">
              Download clip audio
            </a>
          </p>
          {error && (
            <p role="alert">Audio could not load. The link may have expired or been revoked.</p>
          )}
        </>
      ) : !revoked ? (
        <p className="journey-notice">
          Transcript excerpt only · This meeting has no audio recording.
        </p>
      ) : null}
      {!revoked && (
        <section aria-label="Clip transcript">
          {segments.map((s) => (
            <article
              className={`clip-segment ${position + clip.start >= s.start && position + clip.start < s.end ? "is-active" : ""}`}
              key={s.id}
              data-start={s.start - clip.start}
              data-end={s.end - clip.start}
            >
              <button
                disabled={!mediaUrl}
                data-relative-start={s.start - clip.start}
                onClick={() => {
                  if (audio.current) audio.current.currentTime = s.start - clip.start;
                }}
              >
                {formatTime(s.start)} · {participants.find((p) => p.id === s.speakerId)?.name}
              </button>
              <p>{s.text}</p>
            </article>
          ))}
          {!segments.length && (
            <p>
              No complete transcript utterance falls inside this range. Listen to the shared audio.
            </p>
          )}
        </section>
      )}
      <small>
        Only complete utterances within the clip are shown. Boundary utterances are omitted without
        word timestamps. Audio downloads contain only the selected interval. Previously received or
        downloaded media cannot be recalled after revocation.
      </small>
    </main>
  );
}
