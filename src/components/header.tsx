"use client";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  CircleHelp,
  Settings,
  Gift,
  AudioLines,
  ArrowLeft,
  X,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "./workspace-provider";
import { authClient } from "@/lib/auth-client";
import { searchMeetings } from "@/lib/domain";
export function Logo() {
  return (
    <span className="logo">
      SOUNDING <AudioLines size={23} strokeWidth={3} />
    </span>
  );
}
export function Header({ detail = false, shared = false }: { detail?: boolean; shared?: boolean }) {
  const workspace = useWorkspace();
  const meetings = workspace?.saved.map((entry) => entry.meeting) ?? [];
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [info, setInfo] = useState("");
  const results = query.trim() ? searchMeetings(meetings, query) : [];
  return (
    <header className={`app-header ${detail ? "detail-header" : ""}`}>
      <div className="header-top">
        <Link href="/home" aria-label="Sounding home">
          <Logo />
        </Link>
        {!shared && (
          <div className="global-search">
            <Search size={15} />
            <input
              aria-label="Search call recordings"
              placeholder="Search Call Recordings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
            {query.trim() && (
              <div className="search-popover">
                <div className="eyebrow">SEARCH RESULTS · {results.length}</div>
                {results.length ? (
                  results.map((m) => (
                    <Link
                      key={m.id}
                      href={`/calls/${m.id}${m.segments.some((s) => s.text.toLowerCase().includes(query.toLowerCase())) || m.participants.some((p) => p.name.toLowerCase().includes(query.toLowerCase())) ? `?q=${encodeURIComponent(query)}` : ""}`}
                      onClick={() => setQuery("")}
                    >
                      <Search size={15} />
                      <span>
                        {m.title}
                        <small>
                          {m.segments.some((s) =>
                            s.text.toLowerCase().includes(query.toLowerCase()),
                          )
                            ? "Transcript match"
                            : "Title, participant, or summary match"}
                        </small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p>No matches. Try a title, person, or phrase.</p>
                )}
              </div>
            )}
          </div>
        )}
        <div className="header-links">
          {shared ? (
            <span className="demo-label">Read-only shared recording</span>
          ) : (
            <>
              <button
                onClick={() =>
                  setInfo("This is an educational demo. Referral rewards are not connected.")
                }
              >
                <Gift size={18} /> <span>Refer</span>
              </button>
              <button
                onClick={() =>
                  setInfo(
                    "Meeting changes are saved to your workspace. All sample content is fictional. No conferencing account is connected.",
                  )
                }
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>
              <button
                onClick={() =>
                  setInfo(
                    "Open a meeting to play the recording, search the transcript, and track decisions. The one-hour dataset has no audio; its timestamps navigate the transcript.",
                  )
                }
              >
                <CircleHelp size={18} />
                <span>Help & Feedback</span>
              </button>
            </>
          )}
          <div className="account-wrap">
            <button
              className="avatar user-avatar"
              aria-label="Open account menu"
              onClick={() => setMenu(!menu)}
            >
              D
            </button>
            {menu && (
              <div className="account-menu">
                <strong>{workspace?.profile.demo ? "Demo workspace" : "Private workspace"}</strong>
                <small>{workspace?.profile.email ?? "Public shared recording"}</small>
                {!shared && <Link href="/account">Your account</Link>}
                {!shared && (
                  <button
                    onClick={async () => {
                      const { error } = await authClient.signOut();
                      if (error) setInfo("Could not sign out. Please try again.");
                      else window.location.replace("/users/sign_in?reason=signed-out");
                    }}
                  >
                    Sign Out
                  </button>
                )}
                <a
                  href="https://github.com/UmairRathore/fathom-clone"
                  target="_blank"
                  rel="noreferrer"
                >
                  View project <ExternalLink size={13} />
                </a>
                <button
                  onClick={() => {
                    setInfo(
                      "Sounding is an independent Fathom-inspired educational recreation. It is not affiliated with Fathom.",
                    );
                    setMenu(false);
                  }}
                >
                  About Sounding
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {!detail && (
        <nav className="main-nav" aria-label="Main navigation">
          <Link className="active" href="/home">
            My Calls
          </Link>
          {["Team Calls", "Playlists", "Alerts", "Deals"].map((n) => (
            <button
              key={n}
              onClick={() =>
                setInfo(
                  `${n} is outside this demo’s scope. Explore My Calls for the complete recording-to-decision workflow.`,
                )
              }
            >
              {n}
            </button>
          ))}
          <span className="workspace-chip">
            {workspace?.profile.demo ? "DEMO WORKSPACE" : "PRIVATE WORKSPACE"}{" "}
            <ChevronDown size={12} />
          </span>
        </nav>
      )}
      {detail && !shared && (
        <Link className="back-link" href="/home">
          <ArrowLeft size={13} /> My Calls
        </Link>
      )}
      {info && (
        <div className="info-banner" role="status">
          <span>{info}</span>
          <button aria-label="Dismiss notice" onClick={() => setInfo("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
