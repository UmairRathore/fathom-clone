"use client";
import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Bot,
  Check,
  Copy,
  Gift,
  LockKeyhole,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { Modal } from "./modal";
export type ProductDialogKind =
  | "refer"
  | "upgrade"
  | "help"
  | "tutorial"
  | "developers"
  | "terms"
  | "security"
  | "status"
  | "alerts"
  | "about";
const information = {
  tutorial: {
    title: "Make the most of your meetings",
    text: "Open My Calls to play the sample recording, seek from any transcript passage, review summaries and action items, or create a clip. Upload your own recording or try the clearly labeled recording simulation.",
    link: "/capture",
    action: "Try recording simulation",
  },
  developers: {
    title: "Build with your meeting insights",
    text: "API keys, OAuth applications and MCP connections are not available in this assessment demo. No credentials can be issued here.",
    link: "/settings#api-access",
    action: "View API access preview",
  },
  terms: {
    title: "Demo terms",
    text: "Sounding is an independent educational recreation. Sample meetings and premium previews are fictional. No subscription, paid trial or service agreement is activated from these preview controls.",
    link: "/privacy",
    action: "Privacy & demo information",
  },
  security: {
    title: "Security & privacy",
    text: "Private workspaces require server-side authentication. Temporary access ends at the original 24-hour deadline. Sharing requires an explicit action. Preview integrations do not receive your recordings, transcripts or credentials.",
    link: "/privacy",
    action: "Read privacy information",
  },
  status: {
    title: "System status",
    text: "A live service-status feed is not connected. This panel does not claim current uptime or monitor third-party providers.",
    link: "/home",
    action: "Return to My Calls",
  },
  alerts: {
    title: "Stay close to the conversations that matter",
    text: "Team alerts are a premium feature preview. No meeting monitoring, notifications or alert subscriptions are enabled.",
    link: "/team-calls",
    action: "Explore Team Edition",
  },
  about: {
    title: "About Sounding",
    text: "An independent Fathom-inspired educational recreation, built around recordings, searchable transcripts, grounded insights and shareable clips. Sounding is not affiliated with Fathom.",
    link: "/home",
    action: "Explore your meetings",
  },
};
export function ProductDialog({ kind, close }: { kind: ProductDialogKind; close: () => void }) {
  const [copied, setCopied] = useState(false);
  if (kind === "help") return <SupportPanel close={close} />;
  if (kind === "refer")
    return (
      <Modal
        title="Good conversations deserve good company"
        close={close}
        className="product-dialog referral-dialog"
      >
        <div className="referral-hero">
          <Gift size={38} />
          <span>REFER A FRIEND</span>
          <h3>Better meetings. Better together.</h3>
          <p>Give your team a little more clarity.</p>
        </div>
        <label className="referral-label">
          Referral code <span>DEMO PREVIEW</span>
          <div className="referral-copy">
            <input
              aria-label="Demo referral link"
              readOnly
              value="https://sounding.example/invite/demo"
            />
            <button
              className="surface-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText("https://sounding.example/invite/demo");
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </label>
        <p className="surface-caption">
          Example link only. It does not invite people or unlock rewards.
        </p>
        <div className="referral-social">
          <button disabled>𝕏 Tweet</button>
          <button disabled>in LinkedIn</button>
        </div>
        <div className="referral-partner">
          <Sparkles size={22} />
          <div>
            <h4>Make an impact as a partner</h4>
            <p>
              Help more teams discover a calmer way to work. Partner enrollment and referral rewards
              are unavailable in this demo.
            </p>
            <button className="surface-link" disabled>
              Explore the partner program →
            </button>
          </div>
        </div>
      </Modal>
    );
  if (kind === "upgrade")
    return (
      <Modal
        title="More clarity for your whole team"
        close={close}
        className="product-dialog upgrade-dialog"
      >
        <div className="upgrade-emblem">
          <LockKeyhole size={28} />
        </div>
        <p className="surface-kicker">SOUNDING TEAM EDITION</p>
        <p className="upgrade-intro">
          Your next great conversation, connected to the bigger picture.
        </p>
        <ul className="upgrade-benefits">
          {[
            "One searchable library of team conversations",
            "Organized highlight collections and coaching moments",
            "Deal context and CRM workflow previews",
          ].map((item) => (
            <li key={item}>
              <Check size={18} />
              {item}
            </li>
          ))}
        </ul>
        <button className="surface-button primary wide" disabled>
          Start 14-day trial
        </button>
        <p className="surface-caption">
          Premium preview only. Trials, billing and purchases are not connected.
        </p>
        <Link className="surface-link" href="/home" onClick={close}>
          Continue with My Calls
        </Link>
      </Modal>
    );
  const info = information[kind];
  return (
    <Modal title={info.title} close={close} className="product-dialog">
      <p className="product-info-text">{info.text}</p>
      <Link className="surface-button primary" href={info.link} onClick={close}>
        {info.action}
      </Link>
    </Modal>
  );
}
function SupportPanel({ close }: { close: () => void }) {
  const [tab, setTab] = useState<"conversation" | "help">("conversation");
  const [response, setResponse] = useState("");
  return (
    <Modal title="Sounding Support" close={close} className="support-dialog">
      <p className="support-subtitle">A little help, right when you need it.</p>
      <div className="support-content">
        {tab === "conversation" ? (
          <>
            <div className="support-bot">
              <span>
                <Bot size={21} />
              </span>
              <div>
                <small>Sounding Support Bot · Demo</small>
                <p>Hey there 👋 How can we help you today?</p>
              </div>
            </div>
            <div className="support-actions">
              <button
                onClick={() =>
                  setResponse(
                    "AI support is not connected. Try the Help center below for a guide to recordings, transcripts and sharing.",
                  )
                }
              >
                <Sparkles size={16} />
                Ask AI <small>INSTANT</small>
              </button>
              <button
                onClick={() =>
                  setResponse(
                    "Ticket delivery is unavailable in this demo. No message was sent and no ticket was created.",
                  )
                }
              >
                <Send size={16} />
                Open a Ticket
              </button>
              <button
                onClick={() =>
                  setResponse(
                    "Thanks for exploring Sounding. Feedback submission is not connected; nothing is sent or saved.",
                  )
                }
              >
                <MessageCircle size={16} />
                Share Feedback
              </button>
            </div>
            {response && (
              <p className="support-response" role="status">
                {response}
              </p>
            )}
            <p className="support-demo-note">Interactive preview · No support messages are sent.</p>
          </>
        ) : (
          <div className="support-faq">
            <h3>A little clarity</h3>
            {[
              [
                "How do I record a meeting?",
                "Use Upload Recording for your own media, or Start recording simulation for the fictional in-meeting journey. Conferencing bots are not connected.",
              ],
              [
                "Can I share just a clip?",
                "Open a meeting, select a clip range and explicitly create a share link. You can revoke the link later.",
              ],
              [
                "Where are my credentials?",
                "Your login ID stays in Your account. The generated password is displayed only at creation and cannot be retrieved. Temporary accounts expire after 24 hours.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        )}
      </div>
      <div className="support-tabs" role="tablist" aria-label="Support views">
        <button
          role="tab"
          aria-selected={tab === "conversation"}
          onClick={() => setTab("conversation")}
        >
          <MessageCircle size={17} />
          Conversation
        </button>
        <button role="tab" aria-selected={tab === "help"} onClick={() => setTab("help")}>
          <BookOpen size={17} />
          Help center
        </button>
      </div>
    </Modal>
  );
}
