"use client";
import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { answerMeetingQuestion } from "@/lib/summary-service";
import { formatTime, type ActionItem, type Meeting } from "@/lib/domain";
export function MeetingAsk({
  meeting,
  actions,
  seek,
}: {
  meeting: Meeting;
  actions: ActionItem[];
  seek: (time: number) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ReturnType<typeof answerMeetingQuestion> | null>(null);
  function ask(value: string) {
    if (!value.trim()) return;
    setQuestion(value);
    setAnswer(answerMeetingQuestion(meeting, value, actions));
  }
  return (
    <div className="meeting-ask">
      <Sparkles color="#03bced" size={24} />
      <h2>A little clarity goes a long way.</h2>
      <p>
        Explore this meeting’s decisions and next steps. Answers use seeded content and keyword
        matching, with links back to the discussion.
      </p>
      <div className="ask-question-grid">
        {[
          "What are the key decisions?",
          "Who owns the action items?",
          "Summarize the risks",
          "What did we discuss about search?",
        ].map((q) => (
          <button key={q} onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>
      {answer && (
        <div className="ask-answer" role="status">
          <small>DEMO ANSWER · NO AI INFERENCE</small>
          <p style={{ whiteSpace: "pre-line" }}>{answer.text}</p>
          <div className="answer-citations">
            {answer.citations.map((c, i) => (
              <button key={i} onClick={() => seek(c.time)}>
                {formatTime(c.time)} · {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <form
        className="ask-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          aria-label="Ask about this meeting"
          placeholder="Ask anything about this meeting…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
        />
        <div>
          <small>Grounded in this meeting · Demo</small>
          <button disabled={!question.trim()} aria-label="Send meeting question">
            <ArrowUp size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}
