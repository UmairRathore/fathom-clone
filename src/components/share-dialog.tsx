"use client";
import { useState } from "react";
import { Check, Copy, Globe2, LockKeyhole, ExternalLink } from "lucide-react";
import type { Clip } from "@/lib/journey";
import { Modal } from "./modal";
import type { Meeting } from "@/lib/domain";
import type { MeetingState } from "@/lib/state";
function RecordingShareDialog({
  meeting,
  clip,
  state,
  changeVisibility,
  close,
}: {
  meeting: Meeting;
  clip?: Clip;
  state: MeetingState;
  changeVisibility: (value: MeetingState["sharing"]) => void;
  close: () => void;
}) {
  const [link, setLink] = useState("");
  const [expires, setExpires] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  async function copy() {
    if (state.sharing === "restricted") return;
    setBusy(true);
    setError("");
    try {
      let url = link;
      if (!url) {
        const response = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId: meeting.id, visibility: state.sharing, state, clip }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not create the share link.");
        url = `${window.location.origin}${result.path}`;
        setLink(url);
        setExpires(result.expiresAt);
      }
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        setError("Link created. Clipboard access is unavailable; select and copy the link below.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create the link. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={clip ? "Share clip" : "Share Recording"} close={close}>
      <p className="modal-description">
        {clip ? (
          <>
            Share “{clip.title}” from {clip.start} to {clip.end} seconds. Guests see the selected
            transcript segments and, when available, extracted audio.
          </>
        ) : (
          <>
            Share a read-only snapshot of <strong>{meeting.title}</strong>, including your current
            actions and highlights.
          </>
        )}
      </p>
      <div className="share-subheading">PEOPLE WITH ACCESS</div>
      <div className="share-owner">
        <span className="avatar">D</span>
        <div>
          <p>Demo workspace owner</p>
          <small>Fictional content · your workspace</small>
        </div>
        <small>Owner</small>
      </div>
      <div className="share-access">
        {state.sharing === "unlisted" ? <Globe2 size={20} /> : <LockKeyhole size={20} />}
        <div>
          <select
            aria-label="Share link access"
            value={state.sharing}
            disabled={busy}
            onChange={(e) => {
              changeVisibility(e.target.value as MeetingState["sharing"]);
              setLink("");
              setExpires(0);
              setCopied(false);
              setError("");
            }}
          >
            <option value="unlisted">Anyone with the link can view</option>
            <option value="restricted">Only the owner · restricted</option>
          </select>
          <p>
            {state.sharing === "unlisted"
              ? "Unlisted · No account needed · Expires in 24 hours"
              : "Guest link creation is disabled. Invitations are not available in this demo."}
          </p>
        </div>
      </div>
      <div className="share-boundary">
        <LockKeyhole size={12} />
        <p>
          Links are independent, encrypted snapshots. Restricting future sharing does not revoke an
          existing snapshot; it expires after 24 hours. Your workspace requires sign-in.
        </p>
      </div>
      {link && (
        <>
          <div className="share-link">
            <input
              aria-label="Shareable recording link"
              value={link}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
          <a className="share-preview" href={link} target="_blank" rel="noreferrer">
            Open read-only viewer <ExternalLink size={12} />
          </a>
          <small>
            Expires{" "}
            {new Date(expires).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </small>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button className="secondary-button" onClick={close}>
          Done
        </button>
        <button
          className="primary-button"
          disabled={busy || state.sharing === "restricted"}
          onClick={copy}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}{" "}
          {busy ? "Creating link…" : copied ? "Link Copied" : "Copy Link"}
        </button>
      </div>
    </Modal>
  );
}

export function ShareDialog(props: Parameters<typeof RecordingShareDialog>[0]) {
  return props.clip ? (
    <ClipShareDialog
      meeting={props.meeting}
      clip={props.clip}
      state={props.state}
      close={props.close}
    />
  ) : (
    <RecordingShareDialog {...props} />
  );
}
function ClipShareDialog({
  meeting,
  clip,
  state,
  close,
}: {
  meeting: Meeting;
  clip: Clip;
  state: MeetingState;
  close: () => void;
}) {
  const [confirmed, setConfirmed] = useState(meeting.source !== "upload"),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  const excerpts = meeting.segments.filter((s) => s.start >= clip.start && s.end <= clip.end);
  async function create() {
    setBusy(true);
    setError("");
    try {
      let value = link;
      if (!value) {
        const response = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: meeting.id,
            clip,
            visibility: "unlisted",
            state,
            confirmPublic: confirmed,
          }),
          signal: AbortSignal.timeout(60000),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not prepare this clip.");
        value = data.url ?? window.location.origin + data.path;
        setLink(value);
      }
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      } catch {
        setError("Link created. Select and copy it below; clipboard access is unavailable.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare the clip. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Share clip" close={close}>
      <p className="modal-description">
        Share only &quot;{clip.title}&quot; - {(clip.end - clip.start).toFixed(3)} seconds.{" "}
        {meeting.mediaUrl
          ? "Recipients receive an extracted audio file, not the original video or full recording."
          : "This is a transcript-only clip."}
      </p>
      <p>
        Anyone with the link can open it without a Sounding account. Links expire after 24 hours and
        can be revoked from this meeting&apos;s Clips section.
      </p>
      <details>
        <summary>Transcript the recipient will see ({excerpts.length} utterances)</summary>
        {excerpts.map((s) => (
          <p key={s.id}>{s.text}</p>
        ))}
        {!excerpts.length && (
          <p>No complete utterance fits inside this range. Audio remains available.</p>
        )}
        <small>Boundary utterances are omitted because word timestamps are unavailable.</small>
      </details>
      {meeting.source === "upload" && (
        <label className="clip-consent">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={busy || !!link}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I authorize sharing this selected audio excerpt and shown transcript with anyone holding
          the link.
        </label>
      )}
      {link && (
        <>
          <input
            aria-label="Shareable clip link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
          <a href={link} target="_blank" rel="noreferrer">
            Open shared clip
          </a>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {busy && <p role="status">Preparing a secure excerpt...</p>}
      <div className="modal-footer">
        <button className="secondary-button" onClick={close}>
          Done
        </button>
        <button className="primary-button" disabled={busy || !confirmed} onClick={create}>
          {busy
            ? "Preparing clip..."
            : copied
              ? "Link copied"
              : link
                ? "Copy link"
                : "Create public clip link"}
        </button>
      </div>
      <small>
        Revocation blocks new access; audio already downloaded or buffered cannot be recalled.
      </small>
    </Modal>
  );
}
