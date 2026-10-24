"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Header } from "./header";
import { useWorkspace } from "./workspace-provider";
import { formatTime, activeSegment } from "@/lib/domain";
import { captureTransition } from "@/lib/journey";
export function CaptureJourney() {
  const workspace = useWorkspace();
  const [id, setId] = useState("atlas-launch");
  const entry = workspace?.saved.find((s) => s.meeting.id === id);
  return (
    <>
      <Header />
      <main className="journey-page">
        <Link href="/home">← My Calls</Link>
        <h1>From conversation to clarity</h1>
        <p className="journey-notice">
          Calendar & notetaker simulation · No calendar access, meeting connection, microphone
          capture, or AI inference. Replay fictional fixtures to test the full product journey.
        </p>
        <label>
          Meeting scenario
          <select aria-label="Meeting scenario" value={id} onChange={(e) => setId(e.target.value)}>
            <option value="atlas-launch">Atlas launch · synchronized audio · 4 people</option>
            <option value="quarterly-planning">
              Q4 planning · 60 minutes · 8 people · transcript simulation
            </option>
          </select>
        </label>
        {entry && <CaptureSession key={id} id={id} />}
      </main>
    </>
  );
}
function CaptureSession({ id }: { id: string }) {
  const workspace = useWorkspace()!;
  const entry = workspace.saved.find((s) => s.meeting.id === id)!;
  const { meeting, state } = entry;
  const capture = state.capture;
  const [elapsed, setElapsed] = useState(capture?.elapsed ?? 0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [message, setMessage] = useState("");
  const stage = capture?.stage;
  const busy = !!workspace.pending || !!workspace.error;
  useEffect(() => {
    if (!running || stage !== "recording") return;
    const timer = window.setInterval(
      () => setElapsed((n) => Math.min(meeting.duration, n + speed / 10)),
      100,
    );
    return () => window.clearInterval(timer);
  }, [running, stage, speed, meeting.duration]);
  const complete = elapsed >= meeting.duration;
  const segment = meeting.segments[activeSegment(meeting.segments, elapsed)];
  function transition(next: NonNullable<typeof capture>["stage"]) {
    if (stage && !captureTransition(stage, next)) return;
    workspace.update(id, (current) => ({ ...current, capture: { stage: next, elapsed } }));
    setRunning(next === "recording");
  }
  function checkpoint() {
    setRunning(false);
    workspace.update(id, (current) => ({ ...current, capture: { stage: "recording", elapsed } }));
  }
  function highlight() {
    if (!segment || state.highlights.length >= 200) return;
    workspace.update(id, (current) => ({
      ...current,
      capture: { stage: "recording", elapsed },
      highlights: [
        ...current.highlights,
        {
          id: crypto.randomUUID(),
          title: `Live moment · ${formatTime(elapsed)}`,
          time: segment.start,
          end: segment.end,
          category: "Highlight",
          description: segment.text.slice(0, 600),
        },
      ],
    }));
    setMessage(
      `Highlight saved at ${formatTime(segment.start)}. It will appear in the recording insights.`,
    );
  }
  return (
    <section className="journey-card">
      <ol className="journey-steps" aria-label="Recording journey">
        {["connected", "scheduled", "recording", "processing", "ready"].map((step) => (
          <li key={step} aria-current={stage === step ? "step" : undefined}>
            {step === "connected"
              ? "Calendar"
              : step === "scheduled"
                ? "Notetaker"
                : step === "ready"
                  ? "Insights"
                  : step}
          </li>
        ))}
      </ol>
      <h2>{meeting.title}</h2>
      <p>
        {meeting.participants.length} participants · {formatTime(meeting.duration)} · Fictional
        fixture
      </p>
      {!stage && (
        <>
          <p>
            Connect a sample calendar to see the upcoming meeting. This does not request permissions
            from Google or Microsoft.
          </p>
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => transition("connected")}
          >
            Connect demo calendar
          </button>
        </>
      )}
      {stage === "connected" && (
        <>
          <h3>Demo calendar connected</h3>
          <p>Upcoming: {meeting.title}. Choose to admit the simulated Sounding notetaker.</p>
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => transition("scheduled")}
          >
            Add demo notetaker
          </button>
        </>
      )}
      {stage === "scheduled" && (
        <>
          <h3>Notetaker ready in waiting room</h3>
          <p>
            All attendees are fictional. Admit the stub to start replaying the recorded scenario.
          </p>
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => transition("recording")}
          >
            Admit & start recording simulation
          </button>
        </>
      )}
      {stage === "recording" && (
        <>
          <h3>
            {complete
              ? "Replay complete"
              : running
                ? "Recording simulation in progress"
                : "Recording simulation paused"}
          </h3>
          <progress
            aria-label="Recording simulation progress"
            max={meeting.duration}
            value={elapsed}
          />
          <p>
            <time>{formatTime(elapsed)}</time> / {formatTime(meeting.duration)} ·{" "}
            {meeting.participants.find((p) => p.id === segment.speakerId)?.name}
          </p>
          <blockquote>{segment.text}</blockquote>
          <div className="journey-controls">
            <label>
              Replay speed
              <select
                aria-label="Simulation speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value={1}>1×</option>
                <option value={30}>30×</option>
                <option value={120}>120×</option>
              </select>
            </label>
            <button
              className="secondary-button"
              disabled={busy || complete}
              onClick={() => (running ? checkpoint() : setRunning(true))}
            >
              {running ? "Pause & save position" : "Resume replay"}
            </button>
            <button
              className="primary-button"
              disabled={busy || !running || complete}
              onClick={highlight}
            >
              Highlight this moment
            </button>
            <button
              className="secondary-button"
              disabled={busy || complete}
              onClick={() => {
                setElapsed(meeting.duration);
                setRunning(false);
              }}
            >
              Skip to end of fixture
            </button>
            <button
              className="primary-button"
              disabled={busy || !complete}
              onClick={() => transition("processing")}
            >
              Finish & process recording
            </button>
          </div>
          <p>
            Pause or highlight to save your position. The clock only advances while this replay is
            open. Skipping uses the complete fixture; it does not record a real meeting.
          </p>
        </>
      )}
      {stage === "processing" && (
        <>
          <h3>Recording replay received</h3>
          <p>
            Transcript: {meeting.segments.length} timestamped segments. Prepare the fixture
            summaries and action items; no speech recognition or inference runs.
          </p>
          <button className="primary-button" disabled={busy} onClick={() => transition("ready")}>
            Prepare demo insights
          </button>
        </>
      )}
      {stage === "ready" && (
        <>
          <h3>Insights ready</h3>
          <p>
            Review the transcript, switch summary templates, assign action items, and turn your
            saved live highlights into shareable clips.
          </p>
          <Link className="primary-button" href={`/calls/${id}`}>
            Open recording & insights
          </Link>
          <p>
            {meeting.mediaUrl
              ? "Synchronized synthesized audio available."
              : "Transcript-only hour-long simulation; no corresponding audio or video."}
          </p>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
