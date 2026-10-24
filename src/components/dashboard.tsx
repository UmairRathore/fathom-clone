"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Search,
  Sparkles,
  Video,
  Users,
  Play,
  ArrowUpRight,
  SlidersHorizontal,
  Clock3,
  CheckCircle2,
  X,
} from "lucide-react";
import { Header } from "./header";
import { useWorkspace } from "./workspace-provider";
import { formatTime, searchMeetings, type Meeting } from "@/lib/domain";
export function ParticipantTiles({
  meeting,
  compact = false,
  activeId,
}: {
  meeting: Meeting;
  compact?: boolean;
  activeId?: string;
}) {
  return (
    <div
      className={`participant-tiles ${compact ? "compact" : ""} ${meeting.participants.length > 4 ? "many" : ""}`}
    >
      {meeting.participants.map((p, i) => (
        <div
          key={p.id}
          className={`participant-tile tile-${i} ${activeId === p.id ? "speaking" : ""}`}
          style={{ "--person": p.color } as React.CSSProperties}
        >
          <span className="participant-initial">
            {p.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <span className="participant-name">
            {p.name}
            <span className="mic-indicator">▥</span>
          </span>
        </div>
      ))}
    </div>
  );
}
export function Dashboard() {
  const workspace = useWorkspace();
  const meetings = workspace?.saved.map((entry) => entry.meeting) ?? [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [showAsk, setShowAsk] = useState(true);
  const filtered = searchMeetings(meetings, query).filter(
    (m) =>
      filter === "all" ||
      (filter === "recordings" ? m.kind === "recording" : m.participants.length === 8),
  );
  function ask(q: string) {
    setQuestion(q);
    const matches = searchMeetings(
      meetings,
      q
        .replace(
          /what|which|the|are|my|today|summarize|meetings|decisions|action|items|from|for|this|week/gi,
          " ",
        )
        .trim(),
    );
    setAnswer(
      q.toLowerCase().includes("action")
        ? "There are 13 seeded action items across your demo meetings. Open a call to review owners and mark work complete. Alex owns search regression tests; Jordan owns onboarding polish; Sam owns the sharing guide."
        : `Your team is preparing the Atlas Friday launch. The key decisions are a 10% staged rollout, improved onboarding, and a Thursday go/no-go review. ${matches.length} matching demo meeting${matches.length === 1 ? "" : "s"}. This answer is a deterministic demo, grounded in seeded content.`,
    );
  }
  return (
    <>
      <Header />
      <main className={`dashboard ${!showAsk ? "ask-hidden" : ""}`}>
        <section className="library">
          <div className="library-heading">
            <div>
              <h1>My Calls</h1>
              <Link className="journey-entry" href="/capture">
                Try the recording journey →
              </Link>
              <p>Your conversations. All in one place.</p>
            </div>
            <span className="demo-label">
              <span className="status-dot" />{" "}
              {workspace?.profile.demo ? "Demo workspace" : "Private workspace"}
            </span>
          </div>
          <div className="library-tools">
            <div className="local-search">
              <Search size={15} />
              <input
                aria-label="Filter meetings"
                placeholder="Find a meeting…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="Clear meeting filter" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
            </div>
            <label className="filter-control">
              <SlidersHorizontal size={14} />
              <select
                aria-label="Filter meeting type"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All calls</option>
                <option value="recordings">With recording</option>
                <option value="long">8-speaker meetings</option>
              </select>
            </label>
          </div>
          {["2026-10-24", "2026-10-23"].map((date, group) => {
            const groupMeetings = filtered.filter((m) => m.date.startsWith(date));
            return (
              groupMeetings.length > 0 && (
                <section className="date-group" key={date}>
                  <div className="date-heading">
                    <h2>{group ? "Yesterday" : "Today"}</h2>
                    <span>{group ? "October 23" : "October 24"}</span>
                    <div />
                  </div>
                  <div className="meeting-grid">
                    {groupMeetings.map((m) => (
                      <Link className="meeting-card" href={`/calls/${m.id}`} key={m.id}>
                        <div className="meeting-thumbnail">
                          <ParticipantTiles meeting={m} compact />
                          <div className="thumbnail-hover">
                            <span>
                              <Play size={20} fill="currentColor" />
                            </span>
                          </div>
                          <span className="duration-badge">{formatTime(m.duration)}</span>
                          {m.kind === "synthetic" && (
                            <span className="synthetic-badge">TRANSCRIPT DEMO</span>
                          )}
                        </div>
                        <div className="card-title-row">
                          <h3>{m.title}</h3>
                          <ArrowUpRight size={16} />
                        </div>
                        <div className="card-meta">
                          <span>
                            <Users size={12} />
                            {m.participants.length} participants
                          </span>
                          <span>
                            <CheckCircle2 size={12} />
                            {m.status === "ready" ? "Ready" : "Processing"}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            );
          })}
          {!filtered.length && (
            <div className="empty-state">
              <Search size={30} />
              <h2>No call recordings found</h2>
              <p>Try a different title, participant, or transcript phrase.</p>
              <button
                className="primary-button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <div className="library-footnote">
            <Video size={15} />
            <span>
              All meetings use fictional demo content.{" "}
              <Link href="/calls/atlas-launch">
                Try the synchronized recording <ArrowUpRight size={12} />
              </Link>
            </span>
          </div>
        </section>
        {showAsk ? (
          <aside className="ask-panel">
            <div className="ask-panel-title">
              <span>
                <Sparkles size={14} /> ASK SOUNDING
              </span>
              <button aria-label="Collapse Ask Sounding" onClick={() => setShowAsk(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="ask-notice">
              <Sparkles size={17} />
              <div>
                <strong>A little clarity for your whole day.</strong>
                <p>Find the decisions, next steps, and moments that matter across your calls.</p>
              </div>
            </div>
            <div className="ask-welcome">
              <div className="sparkle-orb">
                <Sparkles size={25} />
              </div>
              <h2>
                Less remembering.
                <br />
                More moving forward.
              </h2>
              <p>
                Your meetings have the answers.
                <br />
                Let’s find them together.
              </p>
            </div>
            {answer && (
              <div className="ask-answer" role="status">
                <small>DEMO ANSWER · NO AI INFERENCE</small>
                <p>{answer}</p>
                <Link href="/calls/atlas-launch">
                  Open launch review <ArrowUpRight size={12} />
                </Link>
              </div>
            )}
            <div className="ask-bottom">
              <div className="suggestions">
                {[
                  "Summarize my meetings from today",
                  "What are the launch decisions?",
                  "List my action items for this week",
                ].map((q) => (
                  <button key={q} onClick={() => ask(q)}>
                    {q}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
              <form
                className="ask-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (question.trim()) ask(question);
                }}
              >
                <input
                  aria-label="Ask about your meetings"
                  placeholder="Ask anything…"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={500}
                />
                <div>
                  <span>
                    <Video size={12} /> My Calls <ChevronDown size={12} />
                  </span>
                  <button disabled={!question.trim()} aria-label="Send question">
                    <ArrowUp size={17} />
                  </button>
                </div>
              </form>
              <small className="ask-disclaimer">
                Seeded answers · Changes are saved to your workspace
              </small>
            </div>
          </aside>
        ) : (
          <button className="reopen-ask" onClick={() => setShowAsk(true)}>
            <Sparkles size={15} /> Ask Sounding
          </button>
        )}
      </main>
      <footer className="app-footer">
        <span>
          <Clock3 size={12} /> An independent Fathom-inspired recreation
        </span>
        <span>Built for the moments worth remembering.</span>
      </footer>
    </>
  );
}
