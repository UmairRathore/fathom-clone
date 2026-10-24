# Module 1 — real recording processing

Implemented on `codex/authentication-preview`, based on a4912b9 (the latest authentication, recording-stub and clip work). Original production and `main` remain unchanged. This module adds real uploads and AI processing; it does not add calendar permissions, bots, OAuth configuration, email delivery, recording capture, or new clip features.

## Verified real test

One user-authorized MP4 was selected through the application's file picker, uploaded privately, processed and opened in its owner workspace. The original file was not modified or deleted; its final hash matches the approved upload. No recording, transcript, private URL, credential or private video frame is included in this report or committed evidence.

| Result                 | Verified value                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Original recording     | MP4, 10,696,923 bytes, 267.833 seconds; one audio track, one video track                            |
| Transcription          | gpt-4o-transcribe-diarize, diarized_json, automatic chunking                                        |
| Analysis               | gpt-4o-mini, strict structured output, server-side evidence validation                              |
| Live billable requests | Exactly 2: one transcription, one analysis; no retries                                              |
| Transcript             | 56 grounded timestamped segments, one anonymous voice label                                         |
| Extracted insights     | Enhanced and Project Update views, 4 evidence-linked action items, 1 suggested highlight            |
| Unknown details        | All 4 assignees and deadlines left null; no identities invented                                     |
| Processing time        | Transcription request ~96.97 seconds; analysis request ~10.45 seconds, including ledger bookkeeping |
| Reload                 | Meeting, transcript, action items and selected summary template persisted                           |

Both supported templates are derived from the same saved analysis. Switching templates and editing/completing tasks do not call OpenAI or overwrite the immutable provider result. Manual state remains in the existing meeting-state JSONB column.

### Accuracy and synchronization

All 56 segment bounds were validated against actual media duration. Five preselected technical vocabulary checks from the authorized reconnaissance passed, and all generated source quotations matched their cited transcript segments. This is a limited accuracy observation, not an independently measured word-error rate or a guarantee of semantic correctness. Review AI wording against the original speech before relying on it. No private speech is quoted here.

Browser playback used the original video (267.833 seconds). Early transcript navigation sought to 19.622 seconds with the expected active row; direct middle navigation reached 120 seconds; late navigation selected its source at 247.358 seconds. Real-transcript search returned 9 matches. Global search indexed the new private meeting. Project Update persisted after refresh. Playback-speed control was verified at 1.5×. Initial silence does not falsely activate a speaker.

The model detected one voice; two Google accounts do not prove two distinguishable speakers. Anonymous voice labels are never mapped to real identities automatically. The provider did not supply a language code, so it is stored as null. Urdu/bilingual transcription is not live-verified by this English test.

## Cost and authorization

The user authorized **US$1 total**, for this single recording. The database stores a module-wide authorization and one unique reservation per recording/operation. Each request reserves US$0.20 before contacting the provider; successful or uncertain requests keep their reservation. The approved recording ID must match both server configuration and the database authorization. No public route grants or increases this budget.

Returned usage and published token prices give this estimate:

| Operation     | Returned usage                       | Estimated US$  |
| ------------- | ------------------------------------ | -------------- |
| Transcription | 3,489 input / 6,843 output tokens    | 0.07715250     |
| Analysis      | 2,991 prompt / 777 completion tokens | 0.00091485     |
| Total         | Two billable requests                | **0.07806735** |

Estimated authorization remaining: **US$0.92193265**. Conservative reservations: **US$0.40**, leaving **US$0.60** reservation headroom. Actual account billing was not independently reconciled; this is an application estimate, not a guaranteed OpenAI account billing cap. The earlier duration-based estimate (~US$0.028 combined) was replaced by the higher token-usage estimate after final reconciliation. No payment method, auto-recharge or paid plan was enabled. There was also one non-billable model-list readiness request.

The local live-processing flag and the deployed-preview flag are disabled after verification. Further paid work requires new explicit authorization. Completed jobs always return cached results. There are no automatic billable retries. An interrupted request is marked uncertain after its lease expires; operator review and new authorization are required before attempting additional paid work. Mock tests exercise checkpoint recovery without retranscribing a saved transcript; no additional live recovery request was made.

Prices: [transcription model](https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize), [analysis model](https://developers.openai.com/api/docs/models/gpt-4o-mini).

## Architecture and operations

1. `/upload` requires the existing authenticated private workspace. Demo users can inspect the synthetic demo but cannot upload or process real recordings.
2. A selected file is reviewed locally. The server validates its extension/MIME, request shape, size and duration hint, creates an owner-bound job, and returns a pathname-scoped 10-minute upload capability.
3. The browser uploads directly to a **private Vercel Blob store**, with byte progress and cancellation, bypassing Vercel's function-body limit. Random UUID paths are generated server-side; overwrites and extra suffixes are disabled.
4. Completion reads the actual stored bytes, checks size, parses the container/audio packets with Mediabunny, computes actual duration and a SHA-256 digest, and rejects unusable or over-limit files. Same-owner hashes reuse existing jobs; other owners cannot discover them.
5. Processing advances actual Neon states: Uploaded → Queued → Transcribing → Generating insights → Ready, or Failed. Requests are awaited; no detached work is assumed to survive a response. Atomic claims and leases prevent concurrent duplicate processing.
6. Transcription and analysis execute in separate bounded requests. Provider timeouts are 210 and 80 seconds; the processing function allows 300 seconds. The measured real file completed within these bounds. A timeout fails safely; this does not promise every possible five-minute input will finish before an upstream timeout.
7. Completion atomically inserts the meeting and initial editable state into the existing owner workspace. The library groups dates dynamically, so new recordings appear in My Calls and authorized search.
8. Private playback validates session and ownership next to storage access, then redirects to a two-minute, GET-only signed URL. A copied signed capability can be used until expiry; guessed IDs and unsigned storage URLs are denied. Media retry refreshes access and preserves position.
9. Owner deletion hides the job/meeting and deletes its stored object. `npm run db:cleanup:recordings` removes abandoned uploads and late objects after upload capabilities expire; audit tombstones are retained. No paid scheduler is provisioned.

Limits: five minutes, 24,000,000 bytes, three upload attempts per private user in 24 hours. Accepted: MP4/WebM with audio, MP3, M4A, WAV. Corrupt/unsupported media, missing audio, invalid metadata and out-of-limit files fail explicitly. For video, prefer compressed 720p and preserve clear speech. No synchronous video transcoding or raw media in PostgreSQL/function permanent storage.

Migrations 004 and 005 add durable recording jobs and authorization/request ledgers. Both were applied repeatedly to the dedicated Neon preview database. Existing authentication/workspace tables and synthetic fixtures were retained. Use `npm run db:migrate` before running a new installation; builds do not migrate databases.

### Server configuration

- OPENAI_API_KEY: canonical server-only name. The user's original local name was securely normalized without printing its value.
- BLOB_READ_WRITE_TOKEN: private recording store; ignored locally, secured Preview configuration only.
- TRANSCRIPTION_MODEL: gpt-4o-transcribe-diarize by default. Explicit whisper-1 configuration uses verbose_json and segment timestamps; no automatic fallback or second paid request.
- AI_PROCESSING_ENABLED: false by default and after verification.
- AI_APPROVED_RECORDING_ID: operator-bound approved job; also requires matching database authorization.
- Existing DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL and authentication variables remain server-only.

No key is stored in the database, client props, browser bundle, request arguments or logs. Authorized preview HTTP tests put sensitive headers/bodies in temporary ignored files with restrictive permissions, removing them afterward rather than passing credentials in process arguments.

A dedicated private QA account was used without configuring Google or email providers. Its generated credentials and operator evidence stay in ignored `.module-private/`; they are not evaluator credentials or a new public authentication mechanism.

## Model capability decision

The [official transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text) recommends gpt-transcribe for ordinary transcription, but its documented response does not establish the segment timing required here. gpt-4o-transcribe only documents JSON without grounded segments. The chosen diarization option documents speaker/start/end segments with diarized_json and requires automatic chunking for longer audio; whisper-1 documents segment timestamps with verbose_json. Neither arbitrary word timing nor inferred identities are generated by this app.

Current documentation marks these legacy transcription options deprecated, with shutdown on February 26, 2027. A replacement with supported timing or an explicit alignment dependency will be needed before shutdown. The requested gpt-4o-mini remains the analysis model; no silent substitution was made. Original-language speech is retained where the provider supports it; no translation request is sent.

## Executed verification

- 31 automated tests passed: existing authentication/domain/journey suites plus upload validation, malformed provider responses, evidence/timestamp grounding, concurrent claims, duplicate suppression, checkpoint recovery, ownership, persistence and budget reservation.
- 30 real-recording security HTTP checks passed: anonymous/demo denial, second-account read/media/delete/process denial, invalid metadata, cross-origin denial, owner playback, private-share denial and cached completion.
- Existing authentication and journey/clip HTTP regression suites are recorded in the release verification below.
- Real private Blob upload/read passed. Unsigned access was denied; a short-lived signed read worked and then failed after expiry. Temporary verification objects were deleted.
- TypeScript, ESLint, formatting, production build and dependency audit passed. No known production dependency vulnerabilities were reported.
- Automatic capture verified: complete previous response, current recording prompt, session/model metadata, UTC timestamps, valid UTF-8, unchanged hooks and preserved historical entries. No missing exchange was reconstructed. The current final response can only be verified after the Stop hook runs.
- Configured-secret scan and private-transcript-sentence scan found no leakage in candidate files/agent logs. Client bundles contained no configured secret values.

No word-level timing, speaker identity verification, Urdu live test, arbitrary AI regeneration, live calendar/bot, paid queue service, or new public private-recording sharing is claimed. Existing seeded sharing and clip behavior are preserved.

## Release verification

- Implementation commit: `912a19f` on `codex/authentication-preview`; includes the reviewed automatic capture append. The preceding recording-journey/clip commit `a4912b9` is preserved.
- Protected preview: [Sounding upload](https://sounding-preview-umair-rathore.vercel.app/upload), deployment `25fkHgLzA23LrjKfDwfX8MB3jWCD`, built from the implementation commit. Vercel Authentication remains enabled; no public bypass was added.
- Local final production build: 23 authentication + 18 journey/clip + 30 private-recording HTTP checks passed (71 total), in addition to 31 automated tests.
- Deployed preview: all 30 private-recording HTTP checks passed again, plus seven release/authentication/original-production checks. A separate owner readiness check confirmed `canProcess: false` and the existing job remained Ready.
- Deployed browser: private sign-in succeeded; the original video played with duration 267.833 seconds, readyState 4 and no media error. Seeking to 120 seconds synchronized the active transcript row. No private frame or speech was saved as screenshot evidence.
- Final ledger reconciliation still shows exactly two successful provider operations, US$0.07806735 estimated usage and US$0.40 reserved. Remote cache/readback checks did not create another provider request.
- [Safe local upload completion proof](screenshots/module1/upload-ready.jpg) and [safe preview proof](screenshots/module1/preview-ready.jpg) contain the neutral test title and status only.
- Original production remains [the public demo](https://fathom-clone-three.vercel.app), still pointing to its previous deployment `A6s6ZwNCC2QE622thEYELCSaYY37`. Both local `main` and `origin/main` remain `7cf99f9b686f76f77465ca4dbe2fff610b8cfc51`. No production promotion or production database change was made.

The follow-up evidence commit records these release results. The preview implementation does not require another deployment for documentation-only changes. To inspect the private processed meeting, use the already authenticated local or preview browser tab, select the Ready recording, and open the meeting. The public demo remains isolated from this private recording.
