"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ChevronDown,
  CircleHelp,
  Settings,
  Gift,
  AudioLines,
  ArrowLeft,
  X,
  Star,
  Video,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Download,
  LogOut,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./workspace-provider";
import { authClient } from "@/lib/auth-client";
import { searchMeetings } from "@/lib/domain";
import { ProductDialog, type ProductDialogKind } from "./product-dialogs";
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
  const initial = Array.from(workspace?.profile.name.trim() ?? "")[0]?.toUpperCase();
  const path = usePathname();
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false),
    [points, setPoints] = useState(false);
  const [dialog, setDialog] = useState<ProductDialogKind | null>(null);
  const [info, setInfo] = useState("");
  const menuRoot = useRef<HTMLDivElement>(null),
    pointsRoot = useRef<HTMLDivElement>(null),
    avatar = useRef<HTMLButtonElement>(null);
  const results = query.trim() ? searchMeetings(meetings, query) : [];
  useEffect(() => {
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRoot.current?.contains(target)) setMenu(false);
      if (!pointsRoot.current?.contains(target)) setPoints(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (menu) avatar.current?.focus();
        setMenu(false);
        setPoints(false);
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);
  function open(kind: ProductDialogKind) {
    setMenu(false);
    setPoints(false);
    setDialog(kind);
  }
  async function logout() {
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error();
      window.location.replace("/users/sign_in?reason=signed-out");
    } catch {
      setInfo("Could not sign out. Please try again.");
    }
  }
  return (
    <>
      <header className={`app-header polished-header ${detail ? "detail-header" : ""}`}>
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
                <button aria-label="Refer" onClick={() => open("refer")}>
                  <Gift size={18} />
                  <span>Refer</span>
                </button>
                <Link
                  className={`header-utility ${path === "/settings" ? "selected" : ""}`}
                  href="/settings"
                  aria-label="Settings"
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
                <button aria-label="Help & Feedback" onClick={() => open("help")}>
                  <CircleHelp size={18} />
                  <span>Help &amp; Feedback</span>
                </button>
                <div
                  className="rewards-wrap"
                  ref={pointsRoot}
                  onMouseEnter={() => {
                    setPoints(true);
                    setMenu(false);
                  }}
                  onMouseLeave={() => setPoints(false)}
                >
                  <button
                    className="rewards-trigger"
                    aria-label="Rewards: 10 demo points"
                    aria-expanded={points}
                    aria-controls="rewards-panel"
                    onFocus={() => setPoints(true)}
                    onClick={() => {
                      setPoints(true);
                      setMenu(false);
                    }}
                  >
                    <Star size={18} fill="currentColor" />
                    10
                  </button>
                  {points && (
                    <section
                      className="rewards-popover"
                      id="rewards-panel"
                      aria-label="Demo rewards"
                    >
                      <button
                        className="rewards-close"
                        aria-label="Close rewards"
                        onClick={() => setPoints(false)}
                      >
                        <X size={16} />
                      </button>
                      <span className="rewards-icon">
                        <Star size={28} fill="currentColor" />
                      </span>
                      <h2>Small moments. Big rewards.</h2>
                      <p className="rewards-total">
                        10 <span>demo points</span>
                      </p>
                      <p>Imagine earning points for making every conversation count.</p>
                      <div className="rewards-raffle">
                        <Gift size={22} />
                        <span>
                          A little something to look forward to
                          <small>Raffles, prizes and rewards · Feature preview</small>
                        </span>
                      </div>
                      <small>
                        Illustration only. Points have no cash value. No raffle entry, prize or
                        rewards program is active.
                      </small>
                    </section>
                  )}
                </div>
                <div className="account-wrap" ref={menuRoot}>
                  <button
                    ref={avatar}
                    className="avatar user-avatar"
                    aria-label="Open account menu"
                    aria-expanded={menu}
                    aria-controls="account-panel"
                    onClick={() => {
                      setMenu(!menu);
                      setPoints(false);
                    }}
                  >
                    {initial || <UserRound size={16} aria-hidden="true" />}
                  </button>
                  {menu && (
                    <div
                      className="account-menu polished-account-menu"
                      id="account-panel"
                      aria-label="Account navigation"
                    >
                      <Link href="/capture" onClick={() => setMenu(false)}>
                        <Video size={15} />
                        Start Test Call<span className="menu-hint">Simulation</span>
                      </Link>
                      <button onClick={() => open("tutorial")}>
                        <BookOpen size={15} />
                        Tutorial
                      </button>
                      <button onClick={() => open("help")}>
                        <CircleHelp size={15} />
                        FAQs
                      </button>
                      <button onClick={() => open("developers")}>
                        <ExternalLink size={15} />
                        Developers
                      </button>
                      <hr />
                      <Link href="/account" onClick={() => setMenu(false)}>
                        <Settings size={15} />
                        Your account
                      </Link>
                      <Link href="/privacy" onClick={() => setMenu(false)}>
                        <ShieldCheck size={15} />
                        Privacy Policy
                      </Link>
                      <button onClick={() => open("terms")}>Terms of Service</button>
                      <button onClick={() => open("security")}>Security &amp; Compliance</button>
                      <button onClick={() => open("status")}>System Status</button>
                      <hr />
                      <Link href="/zoomless/onboarding/download" onClick={() => setMenu(false)}>
                        <Download size={15} />
                        Download App
                      </Link>
                      <button aria-label="Sign Out" onClick={logout}>
                        <LogOut size={15} />
                        Logout
                      </button>
                      <a
                        href="https://github.com/UmairRathore/fathom-clone"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={15} />
                        View project
                      </a>
                      <button onClick={() => open("about")}>About Sounding</button>
                      <div className="account-menu-identity">
                        <small>{workspace?.profile.demo ? "Demo workspace" : "Logged in as"}</small>
                        <strong>{workspace?.profile.email ?? "Private workspace"}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        {!detail && (
          <nav className="main-nav" aria-label="Main navigation">
            {[
              { label: "My Calls", href: "/home" },
              { label: "Team Calls", href: "/team-calls" },
              { label: "Playlists", href: "/playlists" },
            ].map((item) => (
              <Link
                key={item.href}
                className={path === item.href ? "active" : ""}
                aria-current={path === item.href ? "page" : undefined}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
            <button onClick={() => open("alerts")}>Alerts</button>
            <Link
              className={path === "/deals" ? "active" : ""}
              aria-current={path === "/deals" ? "page" : undefined}
              href="/deals"
            >
              Deals
            </Link>
            <span className="workspace-chip">
              {workspace?.profile.demo ? "DEMO WORKSPACE" : "PRIVATE WORKSPACE"}{" "}
              <ChevronDown size={12} />
            </span>
          </nav>
        )}
        {detail && !shared && (
          <Link className="back-link" href="/home">
            <ArrowLeft size={13} />
            My Calls
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
      {dialog && !shared && <ProductDialog kind={dialog} close={() => setDialog(null)} />}
    </>
  );
}
