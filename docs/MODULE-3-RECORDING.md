# Module 3 — Recording simulation and live highlights

## Delivered scope

The existing `/capture` route, seeded meetings, workspace save queue, meeting detail, manual highlight schema and Module 2 clip editor are reused. My Calls links directly to **Start recording simulation**. No database migration, new service, meeting bot or transcription system is introduced.

Choose either the synchronized Atlas fixture or the eight-person, one-hour transcript fixture. Connect the demo calendar, admit the stub, start, pause/resume, annotate, finish early or at the end, prepare fixture insights and open the existing meeting. Cancel ends the simulation without deleting saved annotations. Restart uses a fresh capture session ID and retains earlier annotations. The same meeting row is reused, avoiding duplicate recording entries.

All four categories (Highlight, Positive Reaction, Needs Review, Feedback) accept an optional 600-character note. Annotation time is the exact monotonic replay position at the click, including fractional seconds and replay speed; it is not snapped to a transcript segment. IDs are stable, manual provenance and capture-session association persist, and identical rapid clicks/retries are deduplicated. The initial ten-second annotation window is a clip-selection convenience, not an inferred speech boundary; it is clamped to the fixture end.

The simulation clock uses `performance.now()`, not interval counts or the adjustable system clock. It checkpoints every five wall-clock seconds and on pause, annotation, finish and page hiding; hiding pauses the replay. Refresh starts paused at the saved position. The save indicator and existing conflict guard remain authoritative: failed writes require reconnecting, and abrupt termination may lose up to the last checkpoint interval of replay position. Unsaved text in the optional note field is not a saved annotation.

Early finish retains the actual replayed position. The UI explicitly states that the resulting insights and media are the **complete pre-existing fictional fixture**, including unreplayed portions. Legacy capture records retain their prior full-duration validation. New session IDs are optional schema additions and do not rewrite existing records.

## Genuine versus simulated

This module completes the assessment-permitted **simulated bot** path. It does not request microphone permissions or create microphone, screen or camera media. Permission rejection and a five-minute genuine-capture limit are therefore not applicable and were not tested. Real browser recording was deferred to keep this module small and reliable; there is no misleading success state for nonexistent captured media.

Real media remains supported through the existing protected Upload Recording path, with its actual format/audio/duration validation, private storage, ownership checks and five-minute limit. No processing gate was changed. No paid AI call was made. Existing private recording content, transcript, summary and highlights were not modified by this module.

Atlas highlight clicks seek to the real timestamp in its synthesized fixture audio. The hour-long fixture has no corresponding media: its controls navigate the transcript, and the completion screen explicitly says so. Manual highlights remain separate from original fixture/AI annotations. Supported highlights open the existing clip editor, preview, save, share and revocation flow.

## Verification

- 53 application tests: monotonic clock and duration clamp, all four annotation categories, precise fractional timestamps, stable IDs, rapid-click/retry deduplication, immutable original highlights, session association, early finish persistence, legacy compatibility, authentication, isolated workspaces, uploaded-recording security, and clip grants/media boundaries.
- Local browser: connect → admit → record; four categories and optional note; pause and refresh retain all four annotations and saved position; early finish → insights → meeting; four manual labels visible; highlight seeks synthesized audio to its exact timestamp; derived clip previews as ten seconds and saves; restart and cancel work. The eight-person fixture runs at 120× to exactly 60:00 / 3600 seconds, disables further annotations at its end and finishes successfully.
- Local HTTP: 16 new capture checks, including persisted stages, early finish, four annotations exactly once, fixture preservation, demo visitor isolation, clip sharing/revocation and cancel preserving annotations. Existing 19 journey/clip checks also pass.
- All 34 original private-recording security HTTP checks pass using existing non-billable operator tests. No real-microphone workflow or transcription accuracy improvement is claimed.
- TypeScript, lint, production build, formatting, and configured-secret/UTF-8 scanning pass. The production-dependency audit reports zero vulnerabilities.

Protected-preview release evidence and exact commit are recorded after deployment verification. Public production and the separate public clip viewer are not deployment targets for this module. Historical logs and hook configuration are excluded from commits; current prompt/previous final capture and frame checksums were verified read-only.

## Protected-preview release verification

Application commit: `9ab011f` on `codex/authentication-preview`, pushed together with Module 2 validation fix `d89c898`.

The existing protected preview now points to `fathom-clone-d5smu5cvx-umair-rathore.vercel.app` (deployment `3A6qkKCBTevVr1T7QC3SsBiBsw6h`). Vercel Authentication remains enabled. No public-production or public-clip-viewer deployment was performed.

The deployed browser flow passed: connect/admit/start → all four categories plus a note → pause → refresh (all four retained) → early finish → insights → meeting. A manual annotation seeks the fixture audio to 0.425099 seconds. Its ten-second clip preview prepares successfully, saves without validation errors, and both clip and annotation survive another reload. Only fictional fixture content was used in screenshots and these UI tests.

All 16 new capture HTTP checks also pass against the protected deployment, including isolated demo visitors and cookie-free clip viewing followed by revocation. Seven deployed release checks pass: login routing, demo login, Secure/HttpOnly cookies, account access, logout/session revocation, and unchanged public-production access. The existing private recording remains ready and paid processing is disabled.

The original public production's deployment ID and immutable URL match the pre-module baseline. `main` remains at `7cf99f9b686f76f77465ca4dbe2fff610b8cfc51`. Current private logs are unstaged, automatic capture is active, historical-prefix and frame checksums pass, and hook files have no changes. Additional API expenditure: **US$0**.

Screenshots: [local recording screen](screenshots/module3/capture.png), [protected-preview recording screen](screenshots/module3/protected-capture.png).
