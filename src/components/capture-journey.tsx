"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Header } from "./header";
import { useWorkspace } from "./workspace-provider";
import { formatTime, activeSegment, type Category } from "@/lib/domain";
import { captureTransition } from "@/lib/journey";
import {
  appendLiveAnnotation,
  liveAnnotation,
  liveCategories,
  replayTime,
} from "@/lib/live-capture";

export function CaptureJourney() {
  const workspace = useWorkspace();
  const [id, setId] = useState("atlas-launch");
  const [locked, setLocked] = useState(false);
  return (
    <>
      <Header />
      <main className="journey-page">
        <h1>Record the moments that matter</h1>
        <p className="journey-notice">
          Simulated notetaker · No bot joins a meeting and no microphone is captured. Replay a
          fictional fixture and save your own live annotations. No paid AI calls.
        </p>
        <label>
          Meeting scenario
          <select
            aria-label="Meeting scenario"
            value={id}
            disabled={locked}
            onChange={(e) => setId(e.target.value)}
          >
            <option value="atlas-launch">Atlas launch · synchronized audio · 4 people</option>
            <option value="quarterly-planning">
              Q4 planning · 60 minutes · 8 people · transcript simulation
            </option>
          </select>
        </label>
        {workspace?.saved.some((s) => s.meeting.id === id) && (
          <CaptureSession key={id} id={id} lock={setLocked} />
        )}
        <p className="journey-notice">
          Have a real recording? <Link href="/upload">Upload privately</Link> through the existing
          recording pipeline. AI processing remains subject to authorization and budget controls.
        </p>
      </main>
    </>
  );
}
function CaptureSession({ id, lock }: { id: string; lock: (value: boolean) => void }) {
  const workspace = useWorkspace()!;
  const router = useRouter();
  const { meeting, state } = workspace.saved.find((s) => s.meeting.id === id)!;
  const capture = state.capture;
  const stage = capture?.stage;
  const [elapsed, setElapsed] = useState(capture?.elapsed ?? 0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const clock = useRef({ offset: elapsed, at: 0, speed: 1 });
  const elapsedRef = useRef(elapsed);
  const latest = useRef(workspace);
  useEffect(() => {
    latest.current = workspace;
  }, [workspace]);
  const [sessionId, setSessionId] = useState(() => capture?.sessionId ?? crypto.randomUUID());
  const busy = !!workspace.pending || !!workspace.error;
  const complete = elapsed >= meeting.duration;
  const segment = meeting.segments[activeSegment(meeting.segments, elapsed)];
  const recent = state.highlights.filter((h) => h.captureSessionId === sessionId);
  function sample() {
    return running
      ? replayTime(
          clock.current.offset,
          clock.current.at,
          // Called only by recording event handlers, never during render.
          // eslint-disable-next-line react-hooks/purity
          performance.now(),
          clock.current.speed,
          meeting.duration,
        )
      : elapsedRef.current;
  }
  function persist(time: number, next = stage) {
    if (!next) return;
    latest.current.update(id, (current) => ({
      ...current,
      capture: { stage: next, elapsed: time, sessionId: sessionId },
    }));
  }
  function pause() {
    const time = sample();
    elapsedRef.current = time;
    setElapsed(time);
    setRunning(false);
    persist(time);
    return time;
  }
  function resume() {
    // Resume is an event handler; the recording clock starts on the user action.
    // eslint-disable-next-line react-hooks/purity
    clock.current = { offset: elapsedRef.current, at: performance.now(), speed };
    setRunning(true);
  }
  useEffect(() => {
    lock(running || busy);
    return () => lock(false);
  }, [running, busy, lock]);
  useEffect(() => {
    if (!running || stage !== "recording") return;
    // This runs inside the recording effect after commit.
    // eslint-disable-next-line react-hooks/purity
    let lastCheckpoint = performance.now();
    const tick = () => {
      const now = performance.now();
      const time = replayTime(
        clock.current.offset,
        clock.current.at,
        now,
        clock.current.speed,
        meeting.duration,
      );
      elapsedRef.current = time;
      setElapsed(time);
      if (time >= meeting.duration || now - lastCheckpoint >= 5000) {
        latest.current.update(id, (current) => ({
          ...current,
          capture: { stage: "recording", elapsed: time, sessionId: sessionId },
        }));
        lastCheckpoint = now;
      }
      if (time >= meeting.duration) setRunning(false);
    };
    const hidden = () => {
      if (document.visibilityState !== "hidden") return;
      tick();
      setRunning(false);
      latest.current.update(id, (current) => ({
        ...current,
        capture: { stage: "recording", elapsed: elapsedRef.current, sessionId: sessionId },
      }));
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const timer = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [running, stage, id, meeting.duration, sessionId]);
  function transition(next: NonNullable<typeof capture>["stage"]) {
    if (stage && !captureTransition(stage, next)) return;
    const time = sample();
    if (next !== "recording") setRunning(false);
    elapsedRef.current = time;
    setElapsed(time);
    persist(time, next);
    if (next === "recording") resume();
  }
  function annotate(category: Category) {
    const time = sample();
    if (time >= meeting.duration) return;
    const highlight = liveAnnotation({
      id: crypto.randomUUID(),
      sessionId: sessionId,
      time,
      duration: meeting.duration,
      category,
      note,
    });
    workspace.update(id, (current) => ({
      ...current,
      capture: { stage: "recording", elapsed: time, sessionId: sessionId },
      highlights: appendLiveAnnotation(current.highlights, highlight),
    }));
    setNote("");
    setMessage(
      `${category} marked at ${time.toFixed(3)} seconds. Check the save indicator before leaving.`,
    );
  }
  return (
    <section className="journey-card">
      <Link
        href="/home"
        onClick={async (e) => {
          if (!running) return;
          e.preventDefault();
          pause();
          if (await workspace.whenSaved(id)) router.push("/home");
        }}
      >
        ← My Calls
      </Link>
      <ol className="journey-steps" aria-label="Recording journey">
        {["connected", "scheduled", "recording", "processing", "ready"].map((step) => (
          <li key={step} aria-current={stage === step ? "step" : undefined}>
            {step === "connected"
              ? "Demo calendar"
              : step === "scheduled"
                ? "Stub notetaker"
                : step === "ready"
                  ? "Insights"
                  : step}
          </li>
        ))}
      </ol>
      <h2>{meeting.title}</h2>
      <p>
        {meeting.participants.length} fictional participants · {formatTime(meeting.duration)}{" "}
        fixture
      </p>
      {!stage && (
        <>
          <p>
            Choose this scenario to connect a demo calendar. No real calendar permissions are
            requested.
          </p>
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => {
              elapsedRef.current = 0;
              setElapsed(0);
              workspace.update(id, (current) => ({
                ...current,
                capture: { stage: "connected", elapsed: 0, sessionId },
              }));
            }}
          >
            Connect demo calendar
          </button>
        </>
      )}
      {stage === "connected" && (
        <>
          <h3>Demo calendar connected</h3>
          <p>Upcoming: {meeting.title}. Add the simulated Sounding notetaker.</p>
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
          <h3>Stub notetaker ready</h3>
          <p>No bot will join a real call. Start a timeline replay of this fictional meeting.</p>
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
          <h3 className="capture-status">
            <span className={running ? "capture-dot active" : "capture-dot"} />
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
          <p className="capture-time">
            <time aria-label="Elapsed simulation time">{formatTime(elapsed)}</time> /{" "}
            {formatTime(meeting.duration)}
          </p>
          <p>
            Fixture speaker: {meeting.participants.find((p) => p.id === segment.speakerId)?.name}
          </p>
          <blockquote>{segment.text}</blockquote>
          <div className="journey-controls">
            <label>
              Replay speed
              <select
                aria-label="Simulation speed"
                value={speed}
                disabled={running}
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
              onClick={() => (running ? pause() : resume())}
            >
              {running ? "Pause & save position" : "Resume replay"}
            </button>
            <button
              className="primary-button"
              disabled={busy || elapsed <= 0}
              onClick={() => transition("processing")}
            >
              Finish & process recording
            </button>
          </div>
          <label>
            Optional annotation note
            <textarea
              aria-label="Live annotation note"
              maxLength={600}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="live-highlight-controls" aria-label="Mark a live moment">
            {liveCategories.map((category) => (
              <button
                className="secondary-button"
                key={category}
                disabled={busy || !running || complete || state.highlights.length >= 200}
                onClick={() => annotate(category)}
              >
                {category}
              </button>
            ))}
          </div>
          {state.highlights.length >= 200 && (
            <p role="status">This meeting has reached its 200-highlight limit.</p>
          )}
          <p className="journey-notice">
            Timestamps follow the fixture timeline at the selected speed, not a live call. Position
            saves every five seconds and on pause, annotation, finish, or hiding this page. Refresh
            resumes paused at the last saved position.
          </p>
        </>
      )}
      {stage === "processing" && (
        <>
          <h3>Simulation finished · {formatTime(capture!.elapsed)} replayed</h3>
          <p>
            Your annotations are saved alongside the complete fictional fixture, including portions
            you did not replay. No captured media or AI output is being generated.
          </p>
          <button className="primary-button" disabled={busy} onClick={() => transition("ready")}>
            Prepare demo insights
          </button>
        </>
      )}
      {stage === "ready" && (
        <>
          <h3>Demo insights ready</h3>
          <p>
            Review the fixture transcript, summaries and actions with your saved manual annotations.
          </p>
          <Link
            className="primary-button"
            aria-disabled={busy}
            onClick={(e) => {
              if (busy) e.preventDefault();
            }}
            href={`/calls/${id}`}
          >
            Open recording & insights
          </Link>
          <p>
            {meeting.mediaUrl
              ? "Synthesized fixture audio is synchronized with the fixture timeline."
              : "Transcript-only hour-long simulation; no corresponding audio or video. Highlight clicks navigate the transcript, not media."}
          </p>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => {
              const nextSessionId = crypto.randomUUID();
              setSessionId(nextSessionId);
              elapsedRef.current = 0;
              setElapsed(0);
              workspace.update(id, (current) => ({
                ...current,
                capture: { stage: "connected", elapsed: 0, sessionId: nextSessionId },
              }));
              setMessage("Previous annotations are preserved in this meeting.");
            }}
          >
            Start another simulation
          </button>
        </>
      )}
      {stage && stage !== "ready" && (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => {
            setRunning(false);
            workspace.update(id, (current) => ({ ...current, capture: undefined }));
            elapsedRef.current = 0;
            setElapsed(0);
            setSessionId(crypto.randomUUID());
            setMessage("Simulation cancelled. Already saved annotations remain in the meeting.");
          }}
        >
          Cancel simulation
        </button>
      )}
      <section className="live-annotations" aria-label="Recent live annotations">
        <h3>This session’s annotations ({recent.length})</h3>
        {recent.length ? (
          <ol>
            {recent
              .slice(-20)
              .reverse()
              .map((h) => (
                <li key={h.id}>
                  <strong>{h.category}</strong> · <time>{h.time.toFixed(3)}s</time>
                  {h.description && <p>{h.description}</p>}
                </li>
              ))}
          </ol>
        ) : (
          <p>
            Mark an important moment while the simulation is running. Saved notes appear here and on
            the meeting page.
          </p>
        )}
      </section>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
