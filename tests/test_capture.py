"""Capture tests run exclusively in disposable fixture roots; never use real logs."""
import concurrent.futures
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SOURCE = Path(os.environ.get("CAPTURE_TEST_SOURCE", Path(__file__).resolve().parents[1] / ".codex/capture.py"))
ROOT = Path(__file__).resolve().parents[1]


class CaptureTests(unittest.TestCase):
    def setUp(self):
        private = ROOT / ".module-private"
        private.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix="capture-fixture-", dir=private)
        self.root = Path(self.temp.name)
        self.script = self.root / ".codex/capture.py"
        self.script.parent.mkdir()
        shutil.copyfile(SOURCE, self.script)
        self.addCleanup(self.temp.cleanup)
        spec = importlib.util.spec_from_file_location("fixture_capture", self.script)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)

    def payload(self, **changes):
        return {"session_id": "fixture-session", "turn_id": "turn-A", "model": "fixture-model",
                "prompt": "Fixture prompt", "last_assistant_message": "Fixture response", **changes}

    def invoke(self, action="prompt", payload=None):
        return subprocess.run([sys.executable, str(self.script), action],
                              input=json.dumps(payload or self.payload(), ensure_ascii=False).encode("utf8"),
                              cwd=self.root, capture_output=True, timeout=30)

    def log(self):
        return next((self.root / ".agent-logs").glob("*.md"))

    def records(self):
        return self.module.scan_records(self.log().read_bytes())

    def test_append_and_immutable_header(self):
        self.assertEqual(self.invoke().returncode, 0)
        before = self.log().read_bytes()
        self.assertEqual(self.invoke("response").stdout.strip(), b"{}")
        after = self.log().read_bytes()
        self.assertTrue(after.startswith(before))
        records, maximum, incomplete = self.records()
        self.assertEqual([r["num"] for r in records], [1, 2])
        self.assertEqual((maximum, incomplete), (2, 0))
        header = after.split(b"---", 2)[1]
        self.assertNotIn(b"total_exchanges", header)
        self.assertNotIn(b"last_prompt_time", header)
        self.assertEqual(len(list((self.root / ".agent-logs").glob("*.md"))), 1)

    def test_legacy_bytes_and_numbers_are_never_changed(self):
        directory = self.root / ".agent-logs"
        directory.mkdir()
        path = directory / "2020-01-01_00-00-00_fixture-session.md"
        legacy = ("---\r\ntotal_exchanges: 7\r\n---\r\n\r\n"
                  "[LOG_ENTRY type=PROMPT num=7 session=fixture-]\r\n"
                  "timestamp: 2020-01-01T00:00:00.000Z\r\nmodel: legacy\r\n\r\n"
                  "Historical café اردو 🙂\r\n").encode("utf8")
        path.write_bytes(legacy)
        self.assertEqual(self.invoke("response").returncode, 0)
        self.assertTrue(path.read_bytes().startswith(legacy))
        records, maximum, incomplete = self.records()
        self.assertEqual([r["num"] for r in records], [7, 8])
        self.assertEqual((maximum, incomplete), (8, 0))
        self.assertEqual(path.read_bytes()[:len(legacy)], legacy)

    def test_correlation_uses_supplied_turn_not_last_unmatched_prompt(self):
        for action, turn in [("prompt", "interrupted"), ("prompt", "continued"),
                             ("response", "continued"), ("response", "interrupted")]:
            self.assertEqual(self.invoke(action, self.payload(turn_id=turn)).returncode, 0)
        records, _, _ = self.records()
        self.assertEqual([r["turn_id"] for r in records], ["interrupted", "continued", "continued", "interrupted"])
        self.assertEqual([r["num"] for r in records], [1, 2, 3, 4])
        self.assertTrue(all(r["correlation"] == "session+turn" for r in records))
        self.assertTrue(all(r["session_id"] == "fixture-session" for r in records))

    def test_absent_turn_is_explicitly_unavailable(self):
        payload = self.payload()
        del payload["turn_id"]
        self.assertEqual(self.invoke(payload=payload).returncode, 0)
        record = self.records()[0][0]
        self.assertIsNone(record["turn_id"])
        self.assertEqual(record["correlation"], "session-only; turn unavailable")

    def test_utf8_and_raw_content_preserved(self):
        content = "café — اردو 中文 🙂\r\nSecond line\n"
        self.assertEqual(self.invoke(payload=self.payload(prompt=content)).returncode, 0)
        raw = self.log().read_bytes()
        raw.decode("utf8", errors="strict")
        self.assertIn(content.encode("utf8"), raw)
        self.assertEqual(self.records()[2], 0)

    def test_record_like_payload_does_not_advance_numbering(self):
        injected = "\n[LOG_ENTRY type=RESPONSE num=999 session=fixture-]\ntimestamp: fake\nmodel: fake\n\n"
        self.assertEqual(self.invoke(payload=self.payload(prompt=injected)).returncode, 0)
        self.assertEqual(self.invoke("response").returncode, 0)
        self.assertEqual([r["num"] for r in self.records()[0]], [1, 2])

    def test_concurrent_processes_have_one_file_and_unique_event_sequence(self):
        def call(i):
            return self.invoke("prompt" if i % 2 == 0 else "response", self.payload(turn_id=f"turn-{i // 2}"))
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as workers:
            results = list(workers.map(call, range(24)))
        self.assertTrue(all(r.returncode == 0 for r in results))
        records, maximum, incomplete = self.records()
        self.assertEqual([r["num"] for r in records], list(range(1, 25)))
        self.assertEqual((maximum, incomplete), (24, 0))
        for i in range(12):
            group = [r["type"] for r in records if r["turn_id"] == f"turn-{i}"]
            self.assertCountEqual(group, ["PROMPT", "RESPONSE"])
        self.assertEqual(len(list((self.root / ".agent-logs").glob("*.md"))), 1)

    def test_killed_holder_releases_os_lock(self):
        code = ("import importlib.util,time; from pathlib import Path; "
                "s=importlib.util.spec_from_file_location('f',Path('.codex/capture.py')); "
                "m=importlib.util.module_from_spec(s); s.loader.exec_module(m); "
                "lock=m.session_lock('fixture-session'); lock.__enter__(); print('locked',flush=True); time.sleep(30)")
        child = subprocess.Popen([sys.executable, "-c", code], cwd=self.root,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            self.assertEqual(child.stdout.readline().strip(), b"locked")
            child.kill()
            child.communicate(timeout=10)
            self.assertEqual(self.invoke().returncode, 0)
        finally:
            if child.poll() is None:
                child.kill()
                child.communicate(timeout=10)

    def test_torn_multibyte_write_is_preserved_and_next_record_resynchronizes(self):
        self.assertEqual(self.invoke().returncode, 0)
        prefix = self.log().read_bytes()
        code = ("import importlib.util,os; from pathlib import Path; "
                "s=importlib.util.spec_from_file_location('f',Path('.codex/capture.py')); "
                "m=importlib.util.module_from_spec(s); s.loader.exec_module(m); "
                "exec(\"def torn(path,data):\\n fd=os.open(path,os.O_WRONLY|os.O_APPEND|getattr(os,'O_BINARY',0)); "
                "os.write(fd,data[:data.index(chr(0x1f642).encode('utf8'))+1]); os._exit(91)\"); "
                "m.append_bytes=torn; m.capture('response',{'session_id':'fixture-session','turn_id':'turn-A',"
                "'last_assistant_message':chr(0x1f642)})")
        interrupted = subprocess.run([sys.executable, "-c", code], cwd=self.root, capture_output=True, timeout=15)
        self.assertEqual(interrupted.returncode, 91)
        torn = self.log().read_bytes()
        self.assertTrue(torn.startswith(prefix))
        with self.assertRaises(UnicodeDecodeError):
            torn.decode("utf8", errors="strict")
        self.assertEqual(self.invoke("response").returncode, 0)
        self.assertTrue(self.log().read_bytes().startswith(torn))
        records, maximum, incomplete = self.records()
        self.assertEqual([r["num"] for r in records], [1, 3])
        self.assertEqual((maximum, incomplete), (3, 1))
        self.assertEqual(records[-1]["prior_incomplete_records"], 1)

    def test_short_writes_are_completed_without_interleaving(self):
        original = self.module.os.write
        def short(fd, data):
            return original(fd, data[:13])
        self.module.os.write = short
        try:
            self.module.capture("prompt", self.payload(prompt="Unicode اردو 🙂"))
        finally:
            self.module.os.write = original
        records, maximum, incomplete = self.records()
        self.assertEqual((len(records), maximum, incomplete), (1, 1, 0))
        self.log().read_bytes().decode("utf8", errors="strict")

    def test_failure_before_append_leaves_previous_bytes_identical(self):
        self.assertEqual(self.invoke().returncode, 0)
        before = self.log().read_bytes()
        original = self.module.append_bytes
        def fail(path, data):
            raise OSError("fixture failure before write")
        self.module.append_bytes = fail
        try:
            with self.assertRaises(OSError):
                self.module.capture("response", self.payload())
        finally:
            self.module.append_bytes = original
        self.assertEqual(self.log().read_bytes(), before)
        self.assertEqual(self.invoke("response").returncode, 0)
        self.assertEqual([r["num"] for r in self.records()[0]], [1, 2])

    def test_checksum_detects_incomplete_or_corrupted_record_without_repair(self):
        self.assertEqual(self.invoke().returncode, 0)
        data = self.log().read_bytes()
        damaged = data[:-5]  # Fixture-only fault injection: incomplete completion trailer.
        self.log().write_bytes(damaged)
        self.assertEqual(self.invoke("response").returncode, 0)
        self.assertTrue(self.log().read_bytes().startswith(damaged))
        records, maximum, incomplete = self.records()
        self.assertEqual([r["num"] for r in records], [2])
        self.assertEqual((maximum, incomplete), (2, 1))

    def test_agent_identifier_is_preserved_not_inferred(self):
        self.assertEqual(self.invoke(payload=self.payload(agent_id="agent-A")).returncode, 0)
        self.assertEqual(self.invoke("response", self.payload(agent_id="agent-A")).returncode, 0)
        records, _, _ = self.records()
        self.assertEqual([r["agent_id"] for r in records], ["agent-A", "agent-A"])
        self.assertTrue(all(r["correlation"] == "session+agent+turn" for r in records))
    def test_bad_input_diagnostics_do_not_echo_secrets(self):
        secret = "fixture-sensitive-value-do-not-echo"
        result = subprocess.run([sys.executable, str(self.script), "prompt"],
                                input=("{" + secret).encode(), cwd=self.root, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(secret.encode(), result.stdout + result.stderr)
        result = self.invoke(payload=self.payload(session_id="../" + secret))
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(secret.encode(), result.stdout + result.stderr)
        self.assertFalse((self.root / ".agent-logs").exists())


if __name__ == "__main__":
    unittest.main()