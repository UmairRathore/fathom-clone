"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { actionSchema, highlightSchema } from "@/lib/state";
import {
  categories,
  formatTime,
  type ActionItem,
  type Category,
  type Highlight,
  type Meeting,
} from "@/lib/domain";
export type EditorState =
  | { kind: "action"; time: number; item?: ActionItem }
  | { kind: "highlight"; time: number; end: number; excerpt: string };
export function EntryEditor({
  meeting,
  editor,
  close,
  saveAction,
  saveHighlight,
}: {
  meeting: Meeting;
  editor: EditorState;
  close: () => void;
  saveAction: (item: ActionItem) => void;
  saveHighlight: (item: Highlight) => void;
}) {
  const [text, setText] = useState(editor.kind === "action" ? (editor.item?.text ?? "") : "");
  const [assignee, setAssignee] = useState(
    editor.kind === "action" ? (editor.item?.assignee ?? "") : "",
  );
  const [category, setCategory] = useState<Category>("Highlight");
  const [error, setError] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (editor.kind === "action") {
      const parsed = actionSchema.safeParse({
        id: editor.item?.id ?? crypto.randomUUID(),
        text,
        time: editor.time,
        done: editor.item?.done ?? false,
        assignee: assignee || undefined,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      saveAction(parsed.data);
    } else {
      const parsed = highlightSchema.safeParse({
        id: crypto.randomUUID(),
        title: text,
        time: editor.time,
        end: Math.min(editor.end, meeting.duration),
        category,
        description: editor.excerpt.slice(0, 600),
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      saveHighlight(parsed.data);
    }
    close();
  }
  return (
    <Modal
      title={
        editor.kind === "action"
          ? editor.item
            ? "Edit action item"
            : "Add action item"
          : "Create highlight"
      }
      close={close}
    >
      <form onSubmit={submit}>
        <p className="modal-description">
          Linked to the transcript at <strong>{formatTime(editor.time)}</strong>.
        </p>
        <label>
          {editor.kind === "action" ? "Action item" : "Highlight title"}
          <input
            autoComplete="off"
            autoFocus
            value={text}
            maxLength={editor.kind === "action" ? 300 : 120}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              editor.kind === "action" ? "What needs to happen next?" : "Name the moment…"
            }
          />
        </label>
        {editor.kind === "action" ? (
          <label>
            Assign to
            <select
              aria-label="Assign to"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Unassigned</option>
              {meeting.participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label>
              Category
              <select
                aria-label="Highlight category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <p className="highlight-excerpt">“{editor.excerpt}”</p>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button className="secondary-button" type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            {editor.kind === "action"
              ? editor.item
                ? "Save changes"
                : "Add action item"
              : "Create highlight"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
