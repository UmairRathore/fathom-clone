# Final GitHub submission and capture audit

Audit date: **2026-10-25**. Public application source: [`98d7a46`](https://github.com/UmairRathore/fathom-clone/commit/98d7a46ce5544a582f5c2d6c7c80e2e4a5cc3470). [Live application](https://fathom-clone-three.vercel.app) · [Evaluator guide](ASSESSMENT-GUIDE.md).

This is a derived, metadata-only audit, not a replacement prompt/response log. Original log bodies were neither copied here nor edited. Counts below are a snapshot taken during this documentation turn, before its final Stop event.

## Assessment rules reviewed

The supplied original **“8x Assignment — Agent Capture Setup”**, sections 3–4, requires verbatim prompts and complete final responses, UTC timestamps and model names; one file per session; public committed logs interleaved with the code; unchanged historical entries; and two independent-session canaries documented in `CAPTURE-TEST.md`. It explicitly excludes thinking, tool calls and intermediate steps from the requested record.

The later supplied implementation brief repeats the capture obligation while requiring sensitive staged material to be withheld. These requirements conflict where verbatim prompts contain private transcript text or bearer links. The original capture instructions provide **no exception permitting separate private submission or redacted replacement logs**. This audit does not claim such permission. The supplied instructions were reviewed locally; their attachment files are not represented as published assessment rules in this repository.

## Public versus local inventory

GitHub's unauthenticated repository API reports `visibility: public`, `private: false`, default branch `main`. At audit time, remote `main` and `codex/authentication-preview` both resolve to application commit `98d7a46`. The public file inventory was compared with local tracked Git blobs at that revision and actual local capture files. All five filenames exist publicly; the active file is incomplete publicly.

| Session file in `.agent-logs/`                                | Local prompts / responses | Public prompts / responses | First / last event number locally | Last local timestamp (UTC) | Public status                                               |
| ------------------------------------------------------------- | ------------------------- | -------------------------- | --------------------------------- | -------------------------- | ----------------------------------------------------------- |
| `2026-10-24_14-21-43_01a16e49-e0a1-7853-9c10-2100f6f587c3.md` | 1 / 0                     | 1 / 0                      | 1 / 1                             | 2026-10-24T14:21:43.889Z   | Exact local bytes; failed initial canary has no response    |
| `2026-10-24_14-23-52_01a16e4b-e265-79f2-90b4-7bb4e940f7d8.md` | 1 / 1                     | 1 / 1                      | 1 / 1                             | 2026-10-24T14:23:55.856Z   | Exact local bytes; historical encoding corruption preserved |
| `2026-10-24_14-30-53_01a16e52-4808-7392-b54f-471f4291de4f.md` | 1 / 1                     | 1 / 1                      | 1 / 1                             | 2026-10-24T14:30:56.865Z   | Exact local bytes; successful canary A                      |
| `2026-10-24_14-30-57_01a16e52-5c4e-7cb2-890c-176aeeb9734b.md` | 1 / 1                     | 1 / 1                      | 1 / 1                             | 2026-10-24T14:31:00.970Z   | Exact local bytes; successful canary B                      |
| `2026-10-24_16-16-26_01a16eb2-ea7d-7931-9917-4a2a411826f5.md` | 43 / 31                   | 15 / 10                    | 1 / 61                            | 2026-10-25T01:33:18.055Z   | Older public portion only; later private material withheld  |

One file per session is expected; five files do not imply five exchanges. Legacy prompt/response numbering was independent, so first/last numbers do not equal total records. Future format-2 numbers describe event order, not matched exchange pairs.

**Exactly absent from the public active-session file at this snapshot:** 28 additional prompts and 21 additional responses, **49 events** in total. These comprise seven later legacy records (response numbers 11–13 and prompt numbers 16–19) plus 42 format-2 events numbered 20–61. The local file is 109,665 bytes versus 20,795 committed bytes, a net size difference of 88,870 bytes. This size difference is not a standalone raw suffix: older frontmatter and line endings also differ. The public body matches a local body prefix after newline normalization.

The current documentation prompt is already captured as event 61. The preceding completed production-release final response is present as event 60. This turn's response can only be captured after the Stop hook runs; it is not counted as missing prematurely. Subsequent automatic events will increase the local/public gap until an approved submission route is agreed.

## Integrity, chronology and remaining deviations

- All five files decode strictly as UTF-8. The second failed canary still contains the original misdecoded characters; valid UTF-8 storage does not make those original words correct. [CAPTURE-TEST.md](../CAPTURE-TEST.md) records the failure and two later successful canaries. No failed entry was repaired.
- The active file's frozen pre-hardening 40,779-byte baseline still matches SHA-256 `f1f3bc37c89ac1ede885ecaa3f85d2ed35718dc87631902314f806e4a29b2131`. All 42 appended frame digests pass; no incomplete frame is detected. Four other local logs match committed bytes exactly. Hooks and capture implementation are unchanged by this documentation work.
- The first local/public mismatch in the active file is byte 170, in older mutable frontmatter. The differing metadata keys are `total_exchanges` and `last_prompt_time`; the body-prefix comparison succeeds after newline normalization. This predates the append-only fix and is not evidence of a rewrite during the release/documentation work. Exact public/local whole-file equivalence is nevertheless absent.
- New records contain genuine supplied session/turn identifiers, model metadata and UTC timestamps. All 42 complete new frames have a turn identifier and a known model. Legacy entries lack equivalent turn-correlation metadata and cannot be paired reliably after interruptions. Unequal prompt/response counts alone do not prove overwritten events; multiple prompts and interrupted turns must not be reconstructed into invented responses.
- New capture uses a shared event sequence, immutable metadata and checksummed envelopes instead of the assessment's same-number prompt/response pairs and mutable frontmatter totals. Raw text and legacy entry markers remain available, but strict assessment-format compatibility needs acknowledgment. Historical numbering and stale frontmatter were deliberately preserved.
- Work before hook installation cannot be certified from these files. The fresh captured implementation session does not retroactively prove complete reconnaissance/setup capture. No missing historical events have been reconstructed.
- Full public interleaving is impossible to restore without changing history or publishing private material: later implementation commits do not contain their corresponding full automatic log additions. Publishing a later archive would not repair that chronology requirement.

See [capture design and fixture verification](AGENT-CAPTURE.md) for locking, append/fsync behavior, cross-runtime limitations, missing-identifier handling and interrupted writes. These controls protect future events; they cannot recover an event never written. This audit does not claim the historical record is complete merely because the current hooks work.

## Privacy and recommendation

The active local session contains private transcript material and capability-bearing links. It is **not safe for wholesale public staging**. Configured-secret checks are scoped and cannot certify every historical token or every kind of personal data. Private recordings, extracted media, human reference passages, private screenshots, environment values and operational artifacts remain excluded from public Git. They are not required public demo fixtures.

1. **Disclose incomplete public capture to 8x before final submission.** Provide this inventory and the unchanged public canary/history evidence.
2. Obtain a written decision on whether 8x accepts the original unchanged private log through a restricted submission channel, the missing early-capture coverage/interleaving, and the format-2 deviation. **Separate private submission is a proposed exception, not an allowance found in the supplied rules.**
3. Only after that permission and a recipient/access review should the owner submit the unchanged private original through the approved channel. Do not upload it publicly, redact/replace historical entries, invent missing responses, or rewrite Git history to simulate contemporaneous commits. No private archive was created or transmitted by this audit.
4. If 8x requires the entire verbatim public archive without an exception, the present submission remains noncompliant with that requirement. Privacy constraints still prohibit publishing private transcripts, credentials or bearer capabilities.

## Documentation and deployment status

The README and evaluator guide describe the complete publicly deployed application, not the superseded preview-only rollout. Older reports retain their original evidence and carry historical-status notices; their original deployment/authentication statements are not current operating instructions.

This documentation-only change does not deploy application code, migrate databases, modify storage, change authentication, run paid AI requests or rewrite capture files. The deployed application stays at `98d7a46`; GitHub subsequently includes a newer documentation commit. Development previews remain protected; the external clip viewer and cleanup deployment remain unchanged. No application submission blocker was identified in the preceding verified release. **Capture compliance is the unresolved assessment blocker requiring 8x's decision.**
