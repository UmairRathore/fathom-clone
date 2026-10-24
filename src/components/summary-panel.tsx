"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Settings2, Sparkles, RefreshCw } from "lucide-react";
import { demoSummaryService, buildDemoSummary } from "@/lib/summary-service";
import {
  type ActionItem,
  type Meeting,
  type SummarySection,
  type SummaryTemplate,
} from "@/lib/domain";
import { preferencesSchema, type SummaryPreferences } from "@/lib/state";
import { Modal } from "./modal";
export function SummaryPanel({
  meeting,
  actions,
  preferences,
  update,
  seek,
  notify,
  readonly = false,
}: {
  meeting: Meeting;
  actions: ActionItem[];
  preferences: SummaryPreferences;
  update: (value: SummaryPreferences) => void;
  seek: (time: number) => void;
  notify: (text: string) => void;
  readonly?: boolean;
}) {
  const [customize, setCustomize] = useState(false);
  const [draft, setDraft] = useState(preferences);
  const [sections, setSections] = useState<SummarySection[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const shown = sections ?? buildDemoSummary(meeting, preferences, actions);
  async function generate(next: SummaryPreferences) {
    if (busy) return;
    const valid = preferencesSchema.safeParse(next);
    if (!valid.success) {
      notify("Please shorten your guidance to 1,024 characters.");
      return;
    }
    setCustomize(false);
    setBusy(true);
    setProgress(0);
    for (const [index, value] of [25, 50, 75].entries())
      timers.current.push(setTimeout(() => setProgress(value), (index + 1) * 250));
    timers.current.push(
      setTimeout(async () => {
        try {
          const result = await demoSummaryService.generate(meeting, next, actions);
          setSections(result);
          update(next);
          setProgress(100);
        } catch {
          notify("Could not prepare the demo summary. Try again.");
        } finally {
          setBusy(false);
        }
      }, 1000),
    );
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        shown.map((s) => `${s.title}\n${s.bullets.map((b) => `• ${b}`).join("\n")}`).join("\n\n"),
      );
      setCopied(true);
      timers.current.push(setTimeout(() => setCopied(false), 1800));
    } catch {
      notify("Clipboard access is unavailable in this browser.");
    }
  }
  return (
    <>
      <div className="summary-toolbar">
        <div className="pill-control">
          <select
            aria-label="Summary template"
            value={preferences.template}
            disabled={busy}
            onChange={(e) =>
              generate({ ...preferences, template: e.target.value as SummaryTemplate })
            }
          >
            <option>Enhanced</option>
            <option>Project Update</option>
          </select>
          {!readonly && (
            <button
              disabled={busy}
              aria-label="Customize summary"
              onClick={() => {
                setDraft(preferences);
                setCustomize(true);
              }}
            >
              <Settings2 size={12} />
            </button>
          )}
        </div>
        <label className="pill-control language">
          <Sparkles size={10} />
          <select aria-label="Summary language" disabled={busy}>
            <option>English</option>
            <option>Auto</option>
          </select>
        </label>
        <button className="copy-button" onClick={copy} disabled={busy}>
          {copied ? "Copied" : "Copy Summary"}
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      {busy ? (
        <div className="generation-state" role="status" aria-live="polite">
          <div className="spinner" />
          <strong>{progress}%</strong>
          <progress value={progress} max={100} />
          <p>Preparing your demo summary…</p>
          <small>Deterministic demo · no AI inference</small>
        </div>
      ) : (
        <>
          <div className="summary-notice">
            <Sparkles size={12} />
            <span>
              Demo summary · Prepared from fictional content.
              {preferences.length === "concise" ? " Concise format." : ""}
              {preferences.focus !== "all" ? ` Focus: ${preferences.focus}.` : ""}
            </span>
          </div>
          {shown.map((section, i) => (
            <section className="summary-section" key={`${section.title}-${i}`}>
              {i < 3 ? <h2>{section.title}</h2> : <h3>{section.title}</h3>}
              {i === 0 ? (
                <p>
                  <button onClick={() => seek(section.time)}>{section.bullets[0]}</button>
                </p>
              ) : (
                section.bullets.length > 0 && (
                  <ul>
                    {section.bullets.map((bullet, index) => (
                      <li key={index}>
                        <button onClick={() => seek(section.time)} title="Go to discussion">
                          {bullet}
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </section>
          ))}
          {!readonly && (
            <button className="regenerate-button" onClick={() => generate(preferences)}>
              <RefreshCw size={12} /> Regenerate demo summary
            </button>
          )}
          <p className="summary-footnote">
            Deterministic summaries use seeded meeting content. No audio transcription or AI
            inference occurs.{" "}
            {preferences.guidance && (
              <>Your saved guidance: “{preferences.guidance}” (reference note).</>
            )}
          </p>
        </>
      )}
      {customize && (
        <Modal
          title={`Customize ${preferences.template} Template`}
          close={() => setCustomize(false)}
        >
          <p className="modal-description">
            Choose how your demo summary is organized. These options apply deterministic rules to
            the seeded content.
          </p>
          <label>
            Summary length
            <select
              aria-label="Summary length"
              value={draft.length}
              onChange={(e) =>
                setDraft({ ...draft, length: e.target.value as SummaryPreferences["length"] })
              }
            >
              <option value="standard">Standard · Full context</option>
              <option value="concise">Concise · Two points per section</option>
            </select>
          </label>
          <label>
            Focus
            <select
              aria-label="Summary focus"
              value={draft.focus}
              onChange={(e) =>
                setDraft({ ...draft, focus: e.target.value as SummaryPreferences["focus"] })
              }
            >
              <option value="all">All topics</option>
              <option value="decisions">Decisions & takeaways</option>
              <option value="actions">Action items & owners</option>
            </select>
          </label>
          <label>
            Additional guidance
            <textarea
              maxLength={1024}
              value={draft.guidance}
              onChange={(e) => setDraft({ ...draft, guidance: e.target.value })}
              placeholder="Save a note for a future AI-enabled workflow…"
            />
          </label>
          <small>
            {draft.guidance.length}/1024 · Guidance is saved as a reference note; free-form
            instructions are not interpreted by AI in this demo.
          </small>
          <div className="modal-footer">
            <button className="secondary-button" onClick={() => setCustomize(false)}>
              Cancel
            </button>
            <button className="primary-button" onClick={() => generate(draft)}>
              Regenerate Summary
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
