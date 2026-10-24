#!/usr/bin/env python3
"""Append-only Codex capture. Legacy bytes are never rewritten."""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = ROOT / ".agent-logs"
LOCK_TIMEOUT = 5.0
LEGACY = re.compile(rb"(?m)^\[LOG_ENTRY type=(PROMPT|RESPONSE) num=(\d+) session=[^\]\r\n]+\]\r?\ntimestamp: [^\r\n]+\r?\nmodel: [^\r\n]+\r?\n")
FRAME = re.compile(rb"(?m)^\[CAPTURE_RECORD format=2 bytes=(\d+) sha256=([0-9a-f]{64})\]\n")
END = b"\n[CAPTURE_END]\n"


def now():
    return datetime.now(timezone.utc)


def stamp(value):
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def author():
    try:
        result = subprocess.run(["git", "config", "user.name"], cwd=ROOT,
                                text=True, capture_output=True, check=True)
        return result.stdout.strip() or "unknown"
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


@contextmanager
def session_lock(session_id):
    """Same-runtime OS locks, released on process exit; safe on Windows WSL UNC paths."""
    if os.name == "nt":
        import ctypes
        from ctypes import wintypes
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.CreateMutexW.argtypes = [wintypes.LPVOID, wintypes.BOOL, wintypes.LPCWSTR]
        kernel.CreateMutexW.restype = wintypes.HANDLE
        kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel.WaitForSingleObject.restype = wintypes.DWORD
        kernel.ReleaseMutex.argtypes = [wintypes.HANDLE]
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        root_key = str(ROOT.resolve()).replace("\\", "/").casefold().replace("//wsl$/", "//wsl.localhost/")
        key = hashlib.sha256((root_key + "\0" + session_id).encode()).hexdigest()
        handle = kernel.CreateMutexW(None, False, "Local\\CodexCapture-" + key)
        if not handle:
            raise OSError("capture mutex unavailable")
        acquired = False
        try:
            status = kernel.WaitForSingleObject(handle, int(LOCK_TIMEOUT * 1000))
            # WAIT_ABANDONED grants ownership after a prior holder died.
            acquired = status in {0, 0x80}
            if not acquired:
                raise TimeoutError("capture mutex unavailable")
            yield
        finally:
            if acquired:
                kernel.ReleaseMutex(handle)
            kernel.CloseHandle(handle)
    else:
        import fcntl
        directory = LOG_DIR / ".locks"
        directory.mkdir(parents=True, exist_ok=True)
        with (directory / (session_id + ".lock")).open("a+b") as stream:
            deadline = time.monotonic() + LOCK_TIMEOUT
            while True:
                try:
                    fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        raise TimeoutError("capture lock unavailable") from None
                    time.sleep(0.025)
            try:
                yield
            finally:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)

def scan_records(data):
    """Read v1 headers plus complete, checksummed v2 frames, without repairing tails."""
    first = data.find(b"[CAPTURE_RECORD format=2")
    legacy = data if first < 0 else data[:first]
    records = [{"type": m[1].decode("ascii"), "num": int(m[2]), "legacy": True}
               for m in LEGACY.finditer(legacy)]
    maximum = max((record["num"] for record in records), default=0)
    incomplete = 0
    cursor = first if first >= 0 else len(data)
    recovering = False
    while cursor < len(data):
        match = FRAME.search(data, cursor)
        if match is None:
            if not recovering and data[cursor:].strip():
                incomplete += 1
            break
        if not recovering and data[cursor:match.start()].strip():
            incomplete += 1
        start, end = match.end(), match.end() + int(match[1])
        # A reserved sequence can survive even when its content write was interrupted.
        try:
            metadata = json.loads(data[start:].split(b"\n", 1)[0])
            number = metadata.get("num")
            if isinstance(number, int) and not isinstance(number, bool) and number > 0:
                maximum = max(maximum, number)
        except (ValueError, UnicodeError, AttributeError):
            metadata = None
        body = data[start:end]
        complete = (metadata is not None and metadata.get("type") in {"PROMPT", "RESPONSE"}
                    and isinstance(metadata.get("num"), int)
                    and data[end:end + len(END)] == END
                    and hashlib.sha256(body).hexdigest().encode() == match[2])
        if complete:
            try:
                body.decode("utf-8", errors="strict")
            except UnicodeError:
                complete = False
        if complete:
            records.append(metadata)
            cursor = end + len(END)
            recovering = False
        else:
            incomplete += 1
            cursor = start
            recovering = True
    return records, maximum, incomplete


def append_bytes(path, data):
    flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND | getattr(os, "O_BINARY", 0)
    descriptor = os.open(path, flags, 0o600)
    try:
        remaining = memoryview(data)
        while remaining:
            written = os.write(descriptor, remaining)
            if written <= 0:
                raise OSError("capture append did not progress")
            remaining = remaining[written:]
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def capture(action, payload):
    if action not in {"prompt", "response"} or not isinstance(payload, dict):
        raise ValueError("invalid capture invocation")
    session_id = payload.get("session_id")
    if (not isinstance(session_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,159}", session_id)):
        raise ValueError("valid session id required")
    turn_id = payload.get("turn_id")
    if turn_id is not None and (not isinstance(turn_id, str) or not turn_id.strip()):
        turn_id = None
    kind = "PROMPT" if action == "prompt" else "RESPONSE"
    key = "prompt" if action == "prompt" else "last_assistant_message"
    content = payload.get(key) or ""
    if not isinstance(content, str):
        raise ValueError("text content required")
    with session_lock(session_id):
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        moment = now()
        matches = sorted(LOG_DIR.glob(f"*_{session_id}.md"))
        if len(matches) > 1:
            raise ValueError("ambiguous session files")
        path = matches[0] if matches else LOG_DIR / f"{moment:%Y-%m-%d_%H-%M-%S}_{session_id}.md"
        prior = path.read_bytes() if path.exists() else b""
        _, maximum, incomplete = scan_records(prior)
        model = str(payload.get("model") or "unknown")
        metadata = {"type": kind, "num": maximum + 1, "numbering": "event-sequence",
                    "session_id": session_id, "turn_id": turn_id,
                    "agent_id": payload.get("agent_id"), "model": model, "timestamp": stamp(moment),
                    "correlation": ("session+agent+turn" if payload.get("agent_id") else "session+turn") if turn_id is not None else "session-only; turn unavailable",
                    "prior_incomplete_records": incomplete}
        # JSON escapes metadata controls; raw prompt/response text remains unchanged UTF-8.
        record = (json.dumps(metadata, ensure_ascii=True, separators=(",", ":")) + "\n"
                  + f"[LOG_ENTRY type={kind} num={maximum + 1} session={session_id[:8]}]\n"
                  + f"timestamp: {stamp(moment)}\nmodel: {json.dumps(model, ensure_ascii=True)}\n\n"
                  + content + "\n").encode("utf-8")
        header = b""
        if not prior:
            values = {"session_id": session_id, "date": f"{moment:%Y-%m-%d}",
                      "author": author(), "model": model, "tool": "codex-desktop",
                      "project": ROOT.name, "capture_format": 2,
                      "numbering": "event-sequence", "counts": "derive from complete records"}
            header = ("---\n" + "".join(f"{k}: {json.dumps(v, ensure_ascii=True)}\n" for k, v in values.items())
                      + "---\n\n# Session Log\n").encode("utf-8")
        frame = (f"\n\n[CAPTURE_RECORD format=2 bytes={len(record)} sha256={hashlib.sha256(record).hexdigest()}]\n".encode()
                 + record + END)
        append_bytes(path, header + frame)
        if incomplete:
            print("Capture preserved an incomplete prior record; no historical bytes were changed.", file=sys.stderr)
        return path


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else ""
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8", errors="strict"))
    capture(action, payload)
    if action == "response":
        print("{}")


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        main()
    except Exception:
        # Never print payloads, content, paths or exception messages containing private data.
        print("Codex capture failed; no payload details emitted.", file=sys.stderr)
        if action == "response":
            print(json.dumps({"systemMessage": "Capture could not append the final response. Check the hook status."}))
        else:
            raise SystemExit(1)