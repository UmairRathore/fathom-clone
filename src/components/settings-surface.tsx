"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AudioLines,
  Bot,
  Check,
  ChevronDown,
  ExternalLink,
  GripVertical,
  Highlighter,
  LockKeyhole,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
  Video,
} from "lucide-react";
import { Header } from "./header";
function BadgeIcon({ text, color = "cyan" }: { text: string; color?: string }) {
  return (
    <span className={`setting-icon icon-${color}`} aria-hidden="true">
      {text}
    </span>
  );
}
function DisabledToggle({ label, checked = false }: { label: string; checked?: boolean }) {
  return (
    <button
      className="setting-toggle"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled
    >
      <span />
      {checked ? <Check size={10} /> : <span className="toggle-cross">×</span>}
    </button>
  );
}
function SettingRow({
  icon,
  title,
  description,
  children,
  badge,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="setting-row">
      {icon}
      <div className="setting-row-copy">
        <h3>
          {title}
          {badge && <span className="setting-badge">{badge}</span>}
        </h3>
        <p>{description}</p>
      </div>
      <div className="setting-action">
        {children ?? (
          <button className="surface-button compact" disabled>
            Connect <ExternalLink size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
function SettingsSection({
  id,
  title,
  children,
  aside,
}: {
  id: string;
  title: string;
  children: ReactNode;
  aside?: string;
}) {
  return (
    <section id={id} className="settings-section">
      <div className="settings-section-title">
        <h2>{title}</h2>
        {aside && <span>{aside}</span>}
      </div>
      {children}
    </section>
  );
}
const integrations = [
  {
    name: "Claude",
    icon: "✳",
    color: "clay",
    description: "Explore the context behind your meetings with an AI assistant.",
  },
  {
    name: "ChatGPT",
    icon: "◎",
    color: "green",
    description: "Bring your meeting knowledge into the tools you think with.",
  },
  {
    name: "Zapier",
    icon: "✳",
    color: "orange",
    description: "Connect meeting insights to your favorite workflows.",
  },
  {
    name: "Slack",
    icon: "#",
    color: "purple",
    description: "Keep your team close to important highlights and decisions.",
  },
  {
    name: "Salesforce",
    icon: "sf",
    color: "blue",
    description: "Keep customer conversations alongside contacts and opportunities.",
  },
  {
    name: "HubSpot",
    icon: "☷",
    color: "orange",
    description: "Turn conversation context into clearer customer relationships.",
  },
  {
    name: "GoHighLevel",
    icon: "↗",
    color: "blue",
    description: "Bring call summaries into your customer workflows.",
  },
  {
    name: "Task Manager",
    icon: "✓",
    color: "green",
    description: "Send action items to the place your team gets work done.",
  },
];
export function SettingsSurface() {
  return (
    <>
      <Header />
      <main className="settings-surface">
        <div className="settings-page-heading">
          <div>
            <p className="surface-kicker">YOUR WORKSPACE, YOUR WAY</p>
            <h1>Settings</h1>
          </div>
          <Link href="/account" className="surface-link">
            Your account →
          </Link>
        </div>
        <div className="settings-preview-note">
          <LockKeyhole size={17} />
          <p>
            Settings preview. Connections and controls below are inactive; they do not change your
            recordings, sharing, privacy or account. Your working meeting controls remain inside
            each call.
          </p>
        </div>
        <div className="settings-autorecord">
          <span>Auto-record</span>
          <button disabled>
            Nothing. I&apos;ll capture manually <ChevronDown size={15} />
          </button>
          <span>and auto-share</span>
          <button disabled>
            Nothing <ChevronDown size={15} />
          </button>
        </div>
        <nav className="settings-jump-links" aria-label="Settings sections">
          {[
            ["conferencing", "Connections"],
            ["premium", "Premium"],
            ["integrations", "Integrations"],
            ["api-access", "API"],
            ["options", "Options"],
            ["apps", "Apps"],
            ["highlights", "Highlights"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <SettingsSection id="conferencing" title="VIDEO CONFERENCING">
          <article className="connection-card">
            <SettingRow
              icon={<BadgeIcon text="▣" color="blue" />}
              title="Zoom"
              description="Connect a Zoom account for conferencing capture."
              badge="NOT CONNECTED"
            />
            <div className="connection-subrow">
              <span>Auto-capture unscheduled Zoom meetings</span>
              <DisabledToggle label="Auto-capture unscheduled Zoom meetings" />
            </div>
            <div className="connection-subrow">
              <span>Disable “Recording in progress” audio notification</span>
              <button className="surface-button compact outline" disabled>
                Update in Zoom Settings <ExternalLink size={12} />
              </button>
            </div>
          </article>
          <article className="connection-card">
            <SettingRow
              icon={<BadgeIcon text="◧" color="green" />}
              title="Google Meet"
              description="Use the working upload flow for a recording you already have."
              badge="MANUAL CAPTURE"
            >
              <button className="surface-button compact" disabled>
                Connect <ExternalLink size={12} />
              </button>
            </SettingRow>
            <div className="connection-subrow">
              <span>Auto-capture unscheduled Google Meet meetings</span>
              <DisabledToggle label="Auto-capture unscheduled Google Meet meetings" />
            </div>
          </article>
          <article className="connection-card">
            <SettingRow
              icon={<BadgeIcon text="T" color="purple" />}
              title="Microsoft Teams"
              description="Conferencing connections are unavailable in this demo."
              badge="NOT CONNECTED"
            />
          </article>
        </SettingsSection>
        <SettingsSection id="premium" title="PREMIUM FEATURES" aside="TEAM EDITION PREVIEW">
          <div className="settings-card">
            <SettingRow
              icon={<BadgeIcon text="✦" color="gold" />}
              title="Bot Name: Sounding Notetaker"
              description="The display name for a connected notetaker. No bot is connected."
            >
              <button className="surface-button compact" disabled>
                Edit
              </button>
            </SettingRow>
            <SettingRow
              icon={<Bot size={24} />}
              title="Auto-Generate Action Items"
              description="Automatically bring the next steps in a conversation into focus."
              badge="RECOMMENDED"
            >
              <DisabledToggle label="Auto-generate action items" checked />
            </SettingRow>
            <SettingRow
              icon={<AudioLines size={24} />}
              title="Default Meeting Summary Template"
              description="Choose the starting point for a meeting summary."
            >
              <select
                aria-label="Default meeting summary template"
                disabled
                defaultValue="Enhanced"
              >
                <option>Enhanced</option>
              </select>
            </SettingRow>
            <SettingRow
              icon={<ShieldCheck size={24} />}
              title="Recording Notification Banner"
              description="A visible reminder that recording requires attendee consent."
              badge="PREVIEW"
            >
              <DisabledToggle label="Recording notification banner" checked />
            </SettingRow>
          </div>
        </SettingsSection>
        <SettingsSection id="integrations" title="INTEGRATIONS" aside="NO SERVICES CONNECTED">
          <div className="settings-card">
            {integrations.map((item) => (
              <SettingRow
                key={item.name}
                icon={<BadgeIcon text={item.icon} color={item.color} />}
                title={item.name}
                description={item.description}
              />
            ))}
          </div>
        </SettingsSection>
        <SettingsSection id="api-access" title="API ACCESS">
          <div className="settings-card">
            <SettingRow
              icon={<BadgeIcon text="{ }" />}
              title="API Access"
              description="A place for API keys and developer applications. Key issuance is unavailable."
            >
              <button className="surface-button compact" disabled>
                Add
              </button>
            </SettingRow>
            <SettingRow
              icon={<Sparkles size={25} />}
              title="MCP Server"
              description="Connect meeting context to external tools. Setup is not enabled."
            >
              <button className="surface-button compact" disabled>
                Set Up
              </button>
            </SettingRow>
          </div>
        </SettingsSection>
        <SettingsSection id="options" title="OPTIONS">
          <div className="settings-card">
            <SettingRow
              icon={<ShieldCheck size={25} />}
              title="Auto Request Recording Consent"
              description="Request consent ahead of external calls. No requests are sent."
              badge="RECOMMENDED"
            >
              <DisabledToggle label="Auto request recording consent" />
            </SettingRow>
            <SettingRow
              icon={<LockKeyhole size={25} />}
              title="Default Share Link Access"
              description="Original recordings stay private. Create clip links explicitly from a meeting."
            >
              <select aria-label="Default share link access" disabled defaultValue="Private">
                <option>Private until explicitly shared</option>
              </select>
            </SettingRow>
            <SettingRow
              icon={<MessageCircle size={25} />}
              title="In-meeting Chat Interface"
              description="An illustration of in-call assistance. No chat integration is connected."
            >
              <DisabledToggle label="In-meeting chat interface" />
            </SettingRow>
            <SettingRow
              icon={<Sparkles size={25} />}
              title="Use anonymized data to improve AI"
              description="This preview control does not opt you in or transmit meeting data."
            >
              <DisabledToggle label="Use anonymized data to improve AI" />
            </SettingRow>
          </div>
        </SettingsSection>
        <SettingsSection id="apps" title="SOUNDING APPS">
          <div className="settings-card">
            <SettingRow
              icon={<Monitor size={25} />}
              title="Desktop App"
              description="Capture and review meetings from your desktop."
              badge="PREVIEW"
            >
              <button className="surface-button compact" disabled>
                Configure
              </button>
            </SettingRow>
            <SettingRow
              icon={<BadgeIcon text="◉" color="green" />}
              title="Chrome Extension"
              description="A companion for browser meetings. No extension is installed by Sounding."
            >
              <button className="surface-button compact" disabled>
                Install
              </button>
            </SettingRow>
            <SettingRow
              icon={<Video size={25} />}
              title="Zoom App"
              description="An in-meeting companion for hosts. No Zoom app is installed."
            >
              <button className="surface-button compact" disabled>
                Install
              </button>
            </SettingRow>
          </div>
        </SettingsSection>
        <SettingsSection id="highlights" title="HIGHLIGHT OPTIONS">
          <div className="settings-card highlight-options">
            {[
              { label: "Highlight", icon: <Highlighter size={19} />, color: "cyan" },
              { label: "Positive Reaction", icon: <ThumbsUp size={19} />, color: "green" },
              { label: "Needs Review", icon: <TriangleAlert size={19} />, color: "orange" },
              { label: "Feedback", icon: <MessageCircle size={19} />, color: "purple" },
            ].map((item) => (
              <div className={`highlight-option highlight-${item.color}`} key={item.label}>
                <GripVertical size={17} />
                <span>{item.icon}</span>
                <input aria-label={`${item.label} category`} value={item.label} readOnly />
                <button disabled aria-label={`Edit ${item.label} category`}>
                  Edit
                </button>
              </div>
            ))}
            <p className="surface-caption">
              Category preview only. Your existing meeting highlights are unchanged.
            </p>
          </div>
        </SettingsSection>
        <SettingsSection id="delete-account" title="DELETE ACCOUNT">
          <div className="delete-account-card">
            <div>
              <h3>Make sure before you go</h3>
              <p>
                Deleting an account is permanent and removes its recordings and data. Manual
                deletion is unavailable here; temporary accounts still expire automatically after 24
                hours.
              </p>
            </div>
            <button disabled>Delete Account</button>
          </div>
        </SettingsSection>
      </main>
    </>
  );
}
