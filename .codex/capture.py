#!/usr/bin/env python3
"""Append raw Codex prompts and final responses to the assignment capture log."""
from __future__ import annotations
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = ROOT / ".agent-logs"


def now():
    return datetime.now(timezone.utc)


def stamp(value):
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def clean(value):
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-._") or "unknown"


def author():
    try:
        result = subprocess.run(["git", "config", "user.name"], cwd=ROOT, text=True, capture_output=True, check=True)
        return result.stdout.strip() or "unknown"
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def log_path(session_id, moment):
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    safe_id = clean(session_id)
    matches = sorted(LOG_DIR.glob(f"*_{safe_id}.md"))
    return matches[0] if matches else LOG_DIR / f"{moment:%Y-%m-%d_%H-%M-%S}_{safe_id}.md"


def count_entries(data, entry_type):
    return len(re.findall(rf"\[LOG_ENTRY type={entry_type} ", data))


def ensure_header(path, payload, moment):
    model = str(payload.get("model") or "unknown")
    session_id = str(payload.get("session_id") or "unknown")
    project = ROOT.name
    handle = author()
    if not path.exists():
        path.write_text(
            "---\n"
            f"session_id: {session_id}\n"
            f"date: {moment:%Y-%m-%d}\n"
            f"author: {handle}\n"
            f"model: {model}\n"
            "tool: codex-desktop\n"
            f"project: {project}\n"
            "total_exchanges: 0\n"
            "first_prompt_time: pending\n"
            "last_prompt_time: pending\n"
            "---\n\n"
            f"# Session Log - {moment:%Y-%m-%d}\n\n"
            f"Session: `{session_id[:8]}` | Project: `{project}` | Author: `{handle}`\n\n---\n",
            encoding="utf-8",
            newline="",
        )
    return model


def update_metadata(path, moment):
    data = path.read_text(encoding="utf-8")
    prompts = count_entries(data, "PROMPT")
    prompt_times = re.findall(r"\[LOG_ENTRY type=PROMPT .*?\]\ntimestamp: ([^\n]+)", data, re.DOTALL)
    first = prompt_times[0] if prompt_times else stamp(moment)
    last = prompt_times[-1] if prompt_times else stamp(moment)
    data = re.sub(r"(?m)^total_exchanges: .*?$", f"total_exchanges: {prompts}", data, count=1)
    data = re.sub(r"(?m)^first_prompt_time: .*?$", f"first_prompt_time: {first}", data, count=1)
    data = re.sub(r"(?m)^last_prompt_time: .*?$", f"last_prompt_time: {last}", data, count=1)
    path.write_text(data, encoding="utf-8", newline="")


def append_entry(path, entry_type, payload, moment):
    data = path.read_text(encoding="utf-8")
    num = count_entries(data, entry_type) + 1
    session_id = str(payload.get("session_id") or "unknown")
    model = str(payload.get("model") or "unknown")
    content = str(payload.get("prompt") or "") if entry_type == "PROMPT" else str(payload.get("last_assistant_message") or "")
    entry = f"\n\n[LOG_ENTRY type={entry_type} num={num} session={session_id[:8]}]\ntimestamp: {stamp(moment)}\nmodel: {model}\n\n{content}\n"
    with path.open("a", encoding="utf-8", newline="") as stream:
        stream.write(entry)
        stream.flush()


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else ""
    if action not in {"prompt", "response"}:
        raise ValueError("Expected action 'prompt' or 'response'")
    # Codex hook input is UTF-8; do not decode it with the Windows console code page.
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    moment = now()
    session_id = str(payload.get("session_id") or "unknown")
    path = log_path(session_id, moment)
    ensure_header(path, payload, moment)
    if action == "prompt":
        append_entry(path, "PROMPT", payload, moment)
        update_metadata(path, moment)
    else:
        append_entry(path, "RESPONSE", payload, moment)
        print("{}")


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        main()
    except Exception as exc:
        print(f"Codex capture hook failed ({action}): {exc}", file=sys.stderr)
        if action == "response":
            print(json.dumps({"systemMessage": "Capture could not write the final response. Check the Codex hook error output."}))
        else:
            raise SystemExit(1)
