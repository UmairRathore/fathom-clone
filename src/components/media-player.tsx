"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, VideoOff, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { formatTime, activeSegment, type Highlight, type Meeting } from "@/lib/domain";
import { ParticipantTiles } from "./dashboard";
export type SeekRequest = { time: number; revision: number };
export function MediaPlayer({
  meeting,
  time,
  onTime,
  seekRequest,
  highlights,
  suspended = false,
}: {
  meeting: Meeting;
  time: number;
  onTime: (time: number) => void;
  seekRequest: SeekRequest;
  highlights: Highlight[];
  suspended?: boolean;
}) {
  const audio = useRef<HTMLMediaElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const retryTime = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const Media = meeting.mediaType === "video" ? "video" : "audio";
  const candidate = meeting.segments[activeSegment(meeting.segments, time)];
  const active =
    candidate && time + 0.001 >= candidate.start && time < candidate.end ? candidate : undefined;
  useEffect(() => {
    if (audio.current && (ready || audio.current.readyState >= 1))
      audio.current.currentTime = Math.min(seekRequest.time, meeting.duration);
  }, [seekRequest, ready, meeting.duration]);
  useEffect(() => {
    if (suspended) audio.current?.pause();
  }, [suspended]);
  async function togglePlayback() {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    try {
      if (element.ended) element.currentTime = 0;
      await element.play();
      setError("");
    } catch {
      setError("Audio could not start. Try again or continue with the transcript.");
    }
  }
  function scrub(next: number) {
    if (audio.current && (ready || audio.current.readyState >= 1)) audio.current.currentTime = next;
    onTime(next);
  }
  return (
    <div
      className="media-player"
      ref={surface}
      aria-label={
        meeting.mediaUrl
          ? meeting.mediaType === "video"
            ? "Meeting video player"
            : "Meeting audio player"
          : "Transcript timeline"
      }
    >
      {meeting.mediaUrl ? (
        <>
          {meeting.mediaType !== "video" && (
            <ParticipantTiles meeting={meeting} activeId={active?.speakerId} />
          )}
          <span className="media-note">
            {meeting.source === "upload"
              ? "PRIVATE RECORDING · ORIGINAL MEDIA"
              : "SYNTHESIZED SPEECH · DEMO RECORDING"}
          </span>
          <Media
            className={meeting.mediaType === "video" ? "uploaded-video" : undefined}
            ref={(element) => {
              audio.current = element;
            }}
            src={meeting.mediaUrl}
            preload="metadata"
            aria-label={
              meeting.source === "upload"
                ? "Private meeting recording"
                : "Atlas launch review audio"
            }
            onLoadedMetadata={(event) => {
              setReady(true);
              if (retryTime.current !== null) {
                event.currentTarget.currentTime = retryTime.current;
                retryTime.current = null;
              }
            }}
            onTimeUpdate={(e) => onTime(e.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() =>
              setError(
                "The recording could not load or its temporary media URL expired. Retry to refresh access; the transcript remains available.",
              )
            }
          />
        </>
      ) : (
        <div className="media-empty">
          <VideoOff size={29} />
          <h2>
            {meeting.duration >= 3600
              ? "A full hour. Every voice, in context."
              : "Transcript-only meeting"}
          </h2>
          <p>{meeting.description}. Use the timeline to explore the discussion.</p>
          <small>No recording · playback unavailable</small>
        </div>
      )}
      {error && (
        <div className="media-error" role="alert">
          <AlertCircle size={24} />
          <p>{error}</p>
          <button
            className="secondary-button"
            onClick={() => {
              setError("");
              retryTime.current = time;
              audio.current?.load();
            }}
          >
            Retry audio
          </button>
        </div>
      )}
      <div className="media-controls">
        <button
          onClick={togglePlayback}
          disabled={!meeting.mediaUrl}
          aria-label={playing ? "Pause recording" : "Play recording"}
        >
          {playing ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
        </button>
        <button
          aria-label={muted ? "Unmute audio" : "Mute audio"}
          disabled={!meeting.mediaUrl}
          onClick={() => {
            setMuted(!muted);
            if (audio.current) audio.current.muted = !muted;
          }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <time aria-label="Playback position">{formatTime(time)}</time>
        <div
          className="timeline"
          style={{ "--progress": `${(time / meeting.duration) * 100}%` } as React.CSSProperties}
        >
          <input
            type="range"
            min={0}
            max={meeting.duration}
            step={0.1}
            value={Math.min(time, meeting.duration)}
            onChange={(e) => scrub(Number(e.target.value))}
            aria-label={meeting.mediaUrl ? "Recording timeline" : "Navigate transcript timeline"}
          />
          {highlights.map((h) => (
            <span
              className="timeline-marker"
              key={h.id}
              style={{
                left: `${(h.time / meeting.duration) * 100}%`,
                width: `${Math.max(0.6, ((h.end - h.time) / meeting.duration) * 100)}%`,
              }}
              title={h.title}
            />
          ))}
        </div>
        <select
          className="speed-select"
          aria-label="Playback speed"
          value={speed}
          disabled={!meeting.mediaUrl}
          onChange={(e) => {
            setSpeed(e.target.value);
            if (audio.current) audio.current.playbackRate = Number(e.target.value);
          }}
        >
          {[0.75, 1, 1.25, 1.5, 2].map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
        <button
          aria-label="Fullscreen player"
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await surface.current?.requestFullscreen();
            } catch {
              setError(
                "Fullscreen is unavailable in this browser. Audio playback is still available.",
              );
            }
          }}
        >
          <Maximize size={14} />
        </button>
      </div>
    </div>
  );
}
