"use client";
import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CirclePlay,
  LockKeyhole,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Header } from "./header";
import { Modal } from "./modal";
import { ProductDialog } from "./product-dialogs";
export function ProductPreview({ variant }: { variant: "team" | "playlists" | "deals" }) {
  return (
    <div
      className={`product-preview preview-${variant}`}
      role="img"
      aria-label={`Fictional ${variant} product illustration`}
    >
      <div className="mock-window">
        <div className="mock-toolbar">
          <span>My Calls</span>
          <b>{variant === "playlists" ? "Playlists" : "Team Calls"}</b>
          <span>✦</span>
        </div>
        <div className="mock-filter">
          All conversations <ChevronDown size={11} />
          <span>Sample preview</span>
        </div>
        {(variant === "playlists"
          ? ["Customer stories", "Coaching moments", "Product feedback"]
          : variant === "deals"
            ? ["TODAY"]
            : ["TODAY", "YESTERDAY"]
        ).map((section, row) => (
          <div className="mock-section" key={section}>
            <h4>{section}</h4>
            <div className="mock-calls">
              {["Maya Chen", "Jordan Lee", "Sam Taylor"].map((name, i) => (
                <div className="mock-call" key={name}>
                  <div className={`mock-person person-${(i + row) % 3}`}>
                    <span>
                      {name
                        .split(" ")
                        .map((x) => x[0])
                        .join("")}
                    </span>
                    <small>{name}</small>
                    <CirclePlay size={18} />
                  </div>
                  <p>{["Launch review", "Customer discovery", "Product walkthrough"][i]}</p>
                  <div className="mock-text-line" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {variant !== "playlists" && (
        <div className="mock-analytics">
          <span className="surface-kicker">CONVERSATION INSIGHTS</span>
          <h4>
            {variant === "deals" ? "Atlas · Launch opportunity" : "A clearer picture of your team"}
          </h4>
          <div className="mock-stat">
            <strong>
              68 <small>recent calls</small>
            </strong>
            <span className="mock-bars">
              {[18, 32, 24, 45, 30, 56, 43, 65, 48, 70].map((h, i) => (
                <i key={i} style={{ height: h / 2 }} />
              ))}
            </span>
            <strong>
              42% <small>talk time</small>
            </strong>
          </div>
          {["Maya Chen", "Jordan Lee", "Sam Taylor"].map((name, i) => (
            <div className="mock-person-row" key={name}>
              <span className={`mini-avatar person-${i}`}>{name[0]}</span>
              <span>
                {name}
                <small>{["Sales", "Customer Success", "Product"][i]}</small>
              </span>
              <b>{[15, 29, 24][i]}</b>
              <span className="mock-text-line" />
            </div>
          ))}
        </div>
      )}
      <span className="mock-label">Fictional illustration · not your meeting data</span>
    </div>
  );
}
const content = {
  team: {
    label: "SOUNDING TEAM EDITION",
    title: "Bring every great conversation closer to your team",
    intro: "Less searching. More shared understanding.",
    benefits: [
      "Keep customer conversations in one searchable team library",
      "Spend less time moving post-call notes into your CRM",
      "Spot coaching moments with conversation insights",
    ],
  },
  playlists: {
    label: "PLAYLISTS",
    title: "Great moments deserve a place of their own",
    intro:
      "Turn highlights into collections your team can learn from. Bring the right moments together, across every conversation.",
    benefits: [
      "Connect customer feedback across meetings",
      "Build a library of coaching and training moments",
      "Keep memorable customer stories close at hand",
    ],
  },
};
export function LockedFeature({ feature }: { feature: "team" | "playlists" }) {
  const [upgrade, setUpgrade] = useState(false);
  const item = content[feature];
  return (
    <>
      <Header />
      <main className="locked-feature">
        <section className="locked-copy">
          <p className="surface-kicker">{item.label}</p>
          <h1>{item.title}</h1>
          <p className="locked-intro">{item.intro}</p>
          <ul>
            {item.benefits.map((b) => (
              <li key={b}>
                <CheckCircle2 size={23} />
                {b}
              </li>
            ))}
          </ul>
          <button className="surface-button outline locked-cta" onClick={() => setUpgrade(true)}>
            <LockKeyhole size={19} />
            {feature === "team" ? "Start 14-day trial" : "Explore premium playlists"}
          </button>
          <button className="surface-link" onClick={() => setUpgrade(true)}>
            View features &amp; pricing
          </button>
          <p className="surface-caption">Premium feature preview · No billing or team connection</p>
        </section>
        <ProductPreview variant={feature === "team" ? "team" : "playlists"} />
      </main>
      {upgrade && <ProductDialog kind="upgrade" close={() => setUpgrade(false)} />}
    </>
  );
}
export function DealsSurface() {
  const [locked, setLocked] = useState(true),
    [upgrade, setUpgrade] = useState(false);
  return (
    <>
      <Header />
      <main className="deals-surface">
        <div className="deals-title">
          <h1>
            Deals <span>12</span>
          </h1>
          <div>
            <button disabled>
              All deals <ChevronDown size={13} />
            </button>
            <button disabled>
              Any close date <ChevronDown size={13} />
            </button>
          </div>
        </div>
        <div className="deals-search">
          <Search size={16} />
          <span>Search deals</span>
          <small>Illustrative data only</small>
        </div>
        <div className="deals-table-wrap">
          <table className="deals-table">
            <thead>
              <tr>
                {["DEAL", "STAGE", "VALUE", "LAST ACTIVITY", "CLOSE DATE"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "Atlas · Team expansion",
                "Northstar · New business",
                "Lumen · Enterprise review",
                "Cedar · Renewal",
                "Orbit · Product pilot",
                "Meridian · Growth plan",
                "Acorn · New workspace",
                "Canvas · Team edition",
                "Summit · Renewal",
                "Harbor · Discovery",
                "Vertex · New business",
                "Solstice · Expansion",
              ].map((name, i) => (
                <tr key={name}>
                  <td>
                    <span className={`deal-company company-${i % 3}`}>{name[0]}</span>
                    {name}
                  </td>
                  <td>
                    <span className="deal-stage">
                      {["Discovery", "Evaluation", "Proposal"][i % 3]}
                    </span>
                  </td>
                  <td>${(i + 2) * 1200}</td>
                  <td>{i + 1} days ago</td>
                  <td>{["Nov 6, 2026", "Nov 13, 2026", "Nov 20, 2026"][i % 3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!locked && (
          <div className="deals-preview-notice">
            <LockKeyhole size={17} />
            Fictional preview. CRM synchronization is not connected.
            <button className="surface-link" onClick={() => setLocked(true)}>
              Explore deal insights
            </button>
          </div>
        )}
      </main>
      {locked && (
        <Modal
          title="See the story behind every deal"
          close={() => setLocked(false)}
          className="deals-paywall product-dialog"
        >
          <p className="deals-paywall-subtitle">
            Bring the signals from your conversations into focus.
          </p>
          <div className="deals-graphic">
            <ProductPreview variant="deals" />
            <div className="deals-insight">
              <TrendingUp size={18} />
              <span>
                Momentum is building<small>Decision-maker engaged · Next steps agreed</small>
              </span>
              <Sparkles size={17} />
            </div>
          </div>
          <button
            className="surface-button outline wide"
            onClick={() => {
              setLocked(false);
              setUpgrade(true);
            }}
          >
            Start 14-day trial
          </button>
          <button
            className="surface-link"
            onClick={() => {
              setLocked(false);
              setUpgrade(true);
            }}
          >
            View features &amp; pricing
          </button>
          <p className="surface-caption">Locked premium preview · No CRM or billing connection</p>
        </Modal>
      )}
      {upgrade && <ProductDialog kind="upgrade" close={() => setUpgrade(false)} />}
    </>
  );
}
