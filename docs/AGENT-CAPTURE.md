# Automatic capture reliability

The project keeps its existing UserPromptSubmit and Stop commands in `.codex/hooks.json`. The script is run afresh for each event. No hook registration, application code, deployment, account configuration or historical log content is changed by this hardening.

## Storage and compatibility

Existing session filenames are reused. Existing log bytes, including frontmatter, line endings, historical numbering and historical encoding mistakes, are never rewritten or repaired. New records are added using `O_APPEND`, with partial writes completed while holding a session lock, followed by `fsync`.

New sessions have immutable frontmatter with `capture_format: 2`, `numbering: event-sequence` and an instruction to derive counts from records. They omit changing totals and first/last-prompt metadata. Old frontmatter remains a historical snapshot; it must not be interpreted as a live total after migration.

New records retain the `[LOG_ENTRY type=... num=... session=...]` marker and raw UTF-8 text. A format-2 envelope adds JSON metadata, byte length, checksum and completion marker. The scanner reads old entries and new envelopes. Readers that split only at old markers must be updated to understand envelopes; no strict compatibility with ad hoc legacy regex extractors is claimed.

For future records, `num` is one per-session **event sequence**, shared across prompts and responses. It starts above the maximum existing number, including a sequence reserved in a detectable interrupted record. Old entries are not renumbered. Numbers describe event order, not prompt/response pairs.

## Correlation

The [official Codex hook documentation](https://learn.chatgpt.com/docs/hooks) supplies `turn_id` for UserPromptSubmit and Stop. The logger records the full supplied `session_id`, `turn_id`, and optional `agent_id`. Group by session, agent when supplied, and turn. Multiple prompts may belong to a single turn; this is not necessarily a one-to-one exchange.

If a reliable turn ID is absent, the record contains `turn_id: null` and `correlation: session-only; turn unavailable`. The logger never matches the latest unmatched prompt, generates a substitute turn ID, or reconstructs an old event. Repeated hook deliveries are retained as separate capture events; no unsupported delivery identity is invented for deduplication.

The prompt starting this hardening turn was captured by the previous implementation. The automatic Stop invocation after installation will use the new implementation. That old prompt cannot gain correlation metadata retroactively. Correlation is available for subsequent prompts and responses when their payloads provide matching IDs. This turn's final Stop execution can only be verified after it happens.

## Concurrency and interruption limits

- Windows uses a project/session-specific OS mutex. This avoids unsupported Windows byte-range locks on the project's WSL UNC filesystem. A dead holder releases ownership through the OS; an abandoned mutex can be acquired by the next invocation.
- Linux uses `flock` with persistent operational lock files under `.agent-logs/.locks/`, ignored by Git. Lock files must not be deleted while writers may exist.
- Lock acquisition has a five-second timeout and capture failure is surfaced without printing payloads or exception details.
- Windows and Linux lock mechanisms **do not interoperate**. Do not run simultaneous Windows and Linux hook writers against one session file. The desktop uses its unchanged Windows command; Linux support is tested separately.
- Complete records are UTF-8 and checksummed. Incomplete records are preserved, detected and excluded from completed-record counts. Later records indicate prior incomplete records. A byte-length/checksum envelope detects torn writes; it is not a cryptographic authenticity guarantee.
- A process or storage failure partway through a multibyte character can leave an invalid UTF-8 fragment. Append-only preservation prevents repairing it automatically. The byte-oriented scanner can continue reading subsequent complete UTF-8 records without modifying that fragment. Power-loss durability of the underlying/network filesystem is not guaranteed by a successful `fsync`.
- A crash before any event bytes are written leaves no captured event. The logger does not reconstruct it. Only participating same-runtime writers obey the lock; an old script or external editor is outside this guarantee.

## Fixture tests

Run `python -m unittest discover -s tests -p test_capture.py -v` using Python 3. Tests copy the hook into disposable `.module-private/capture-fixture-*` roots and exercise simulated hook payloads. They never invoke capture against actual historical logs.

Fourteen tests passed independently on Windows and WSL/Linux:

- append behavior, one file per session, immutable new frontmatter;
- byte-for-byte legacy preservation with original numbering and CRLF/Unicode content;
- supplied turn correlation across interrupted/out-of-order events;
- explicitly missing turn identifiers and preserved agent identifiers;
- raw English, accented, Urdu, Chinese and emoji UTF-8;
- record-like text inside payloads does not change numbering;
- 24 concurrent processes produce unique sequential events in one file;
- killing a lock holder permits subsequent capture;
- failure before append leaves all previous bytes identical;
- short writes complete without interleaving;
- an incomplete trailer is detected without repair;
- a killed multibyte write remains untouched and a later complete record resynchronizes;
- malformed input diagnostics do not echo a fixture secret.

Historical-log SHA-256 values are checked before and after installation, read-only. The privacy-sensitive current log is not staged or committed. The automatic Stop append at the end of the turn is expected and is distinct from manually editing historical bytes.
