"use client";
import { useState } from "react";
import type { InsightReview } from "@/lib/recordings/review";
import type { ActionItem, Highlight } from "@/lib/domain";
import { formatTime } from "@/lib/domain";
export function InsightReviewPanel({
  id,
  seek,
  applyAction,
  addHighlight,
  highlights,
}: {
  id: string;
  seek: (time: number) => void;
  applyAction: (detail: Pick<ActionItem, "id" | "assigneeName" | "dueDate">) => void;
  addHighlight: (highlight: Highlight) => void;
  highlights: Highlight[];
}) {
  const [review, setReview] = useState<InsightReview | null>(null);
  const [status, setStatus] = useState("");
  async function load() {
    setStatus("Loading review…");
    try {
      const response = await fetch(`/api/recordings/${encodeURIComponent(id)}/review`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setReview(await response.json());
      setStatus("");
    } catch {
      setStatus("Review unavailable. Sign in again or try later.");
    }
  }
  return (
    <section className="insight-review">
      <h3>Review meeting insights</h3>
      <p>
        Compare the original extraction with details explicitly present in the saved transcript.
        Recognition errors may remain. No new AI request.
      </p>
      {!review && (
        <button className="button secondary" onClick={load} disabled={status === "Loading review…"}>
          Review source evidence
        </button>
      )}
      <p role="status">{status}</p>
      {review && (
        <>
          <p>
            <strong>Transcript-based review · not audio verified</strong>. Original transcript and
            AI results remain unchanged.
          </p>
          <h4>Task details</h4>
          {review.actions.map((a) => (
            <article key={a.id}>
              <strong>{a.title}</strong>
              <p>
                Original: {a.originalAssignee ?? "Unassigned"} ·{" "}
                {a.originalDueDate ?? "No deadline"}
              </p>
              <p>
                Reviewed:{" "}
                {a.assignee ??
                  (a.selfAssigned ? "Self-assigned · voice identity unknown" : "Unassigned")}{" "}
                · {a.dueDate ?? "No explicit deadline"}
              </p>
              <blockquote>{a.quote}</blockquote>
              <button onClick={() => seek(a.time)}>Check source {formatTime(a.time)}</button>{" "}
              {a.changed && (
                <button
                  onClick={() => {
                    applyAction({ id: a.id, assigneeName: a.assignee, dueDate: a.dueDate });
                    setStatus(
                      "Task details applied to your workspace. Original AI result retained.",
                    );
                  }}
                >
                  Apply explicit details
                </button>
              )}
              {a.changed && (
                <button
                  onClick={() => {
                    applyAction({
                      id: a.id,
                      assigneeName: a.originalAssignee,
                      dueDate: a.originalDueDate,
                    });
                    setStatus("Original extracted details restored.");
                  }}
                >
                  Restore original details
                </button>
              )}
            </article>
          ))}
          <details>
            <summary>Summary evidence</summary>
            {review.summaries.Enhanced.map((section) => (
              <article key={section.title}>
                <h4>{section.title}</h4>
                {section.bullets.map((bullet, i) => (
                  <p key={i}>
                    <button onClick={() => seek(section.bulletTimes?.[i] ?? section.time)}>
                      {formatTime(section.bulletTimes?.[i] ?? section.time)}
                    </button>{" "}
                    {bullet}
                  </p>
                ))}
              </article>
            ))}
          </details>
          <details>
            <summary>Additional source passages</summary>
            <p>Verbatim excerpts grouped for review. These are not newly verified facts.</p>
            {review.evidenceNotes.map((note) => (
              <article key={`${note.topic}-${note.sourceSegmentId}`}>
                <strong>{note.topic}</strong>
                <blockquote>{note.quote}</blockquote>
                <button onClick={() => seek(note.time)}>
                  Check source {formatTime(note.time)}
                </button>
              </article>
            ))}
          </details>
          <h4>Suggested moments</h4>
          <p>Derived from cited summary evidence. Separate from your manual highlights.</p>
          {review.highlights.map((h) => (
            <article key={h.id}>
              <strong>{h.title}</strong>
              <p>{h.description}</p>
              <blockquote>{h.quote}</blockquote>
              <button onClick={() => seek(h.time)}>Check source {formatTime(h.time)}</button>{" "}
              <button
                disabled={highlights.some((existing) => existing.id === h.id)}
                onClick={() => addHighlight(h)}
              >
                {highlights.some((existing) => existing.id === h.id)
                  ? "Added"
                  : "Add suggested highlight"}
              </button>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
