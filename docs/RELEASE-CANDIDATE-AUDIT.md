# Sounding release-candidate functionality audit

Date: 2026-10-25 (Asia/Karachi).
Branch: `codex/authentication-preview`.
Protected preview: https://sounding-preview-umair-rathore.vercel.app
Application revision audited: `40339aed4ef8af4b2c6b16b1461f6dabeb4fd37e`.
The audit commit adds this report, a cleanup regression test and protected-preview test transport support; it changes no application behavior.

## Recommendation

**GO for the agreed 8x assessment/demo release scope.** No unresolved P0 or P1 application defect was identified in the executed checks. Public production was not promoted or modified. This recommendation includes the intentional simulation, unavailable integrations and spending restrictions below; it does not certify a general-purpose production SaaS or new speech-recognition accuracy.

## Feature matrix

| Feature | Result | Verified evidence and scope |
| --- | --- | --- |
| Disposable registration and onboarding | PASS | Two fresh name-only browser accounts; unique generated IDs; creation-only masked password and private copy control; personal setup, consent gating, role choice, Zoom/desktop Skip; unavailable team/provider controls disabled. |
| Login, profile and expiration | PASS | Actual browser logout/generated-credential login; refresh retained authentication; avatar R matched the test name; profile retained ID but no retrievable password; original deadline unchanged and exactly 24 hours after creation. Expired account/session rejection and fixation/CSRF/rate-limit behavior passed isolated regression tests. |
| Public demo | PASS | Browser entry without credentials, logout/reentry restored an untouched visitor state; separate HTTP visitors could not see each other's changes or private recordings. |
| Meeting library | PASS | Four fictional meetings, card navigation, transcript-aware search, recording filter, no-results messaging and primary navigation. Existing date grouping was checked; there is no separate user-selectable sorting control. |
| Existing real upload and AI output | PARTIAL | Owner retained the ready original recording, all 56 saved segments, five summary sections, four action items and existing annotation/review suggestions. Real playback at 1:50 and active passage seeking worked; full transcript copy included all 56 displayed phrases. Private media range access and owner isolation passed. No new file was uploaded or processed; invalid metadata/media tests and mocked provider regressions passed. No new recognition accuracy/WER claim is made. |
| Meeting detail interactions | PASS | Fictional meeting template changed to Project Update and survived refresh. Manual highlight, action creation/edit/assignment/completion and persistence passed. Transcript seek, filters/search, copy and desktop/mobile layout were exercised. Real recording checked without altering its transcript or highlights. |
| Recording simulation | PASS, simulated | Connect stub calendar, add stub notetaker, start, pause/resume, all four annotation categories with optional notes, finish, prepare fixture insights, open meeting, seek from annotation and cancel. Disclosure remains explicit: no bot, microphone capture or new AI output. |
| Clips and external sharing | PASS | Browser highlight → fractional clip 13.125–17.375 → preview → save → public link → guest playback to 4.249977s (one audio-frame rounding) → revoke → denial → delete. Editor had no visible validation error for this valid range. Real beginning/middle/end extracts matched independently decoded source PCM exactly. No source media redirect, unrestricted transcript, bearer token or private content was included in this report. |
| Hour-long meeting | PASS, synthetic | Eight participants, 240 transcript segments; search, speaker filter, virtualized rows, 52:30 seek, final row 239 and 60:00 end position. Full copying included beginning and ending passages. No hour-long audio/video exists; play remains disabled. |
| Secondary pages | PASS as disclosed previews | Team Calls, Playlists, Deals and Settings loaded; active navigation, Refer/Help/Alerts dialogs, rewards popover and profile/logout worked. Settings had 34 disabled mutation controls and no Google/Zoom OAuth links. Premium/team/provider/desktop features remain illustrative. |
| Security and privacy | PASS within tested scope | Cross-account denial, expired/revoked sessions and shares, Secure/HttpOnly cookies, source authorization, malformed ranges, CSRF and spending/idempotency gates. Configured secrets and QA passwords absent from checked reachable Git blobs, client assets and five automatic logs. This is not an exhaustive historical-secret or penetration-test guarantee. |
| Cleanup | PARTIAL live execution | Unchanged dedicated cleanup deployment is READY; local deployment configuration retains daily `17 0 * * *`; deployed anonymous request returns 401. New regression test exercised real HTTP-handler authentication and successful/idempotent cleanup against an isolated PostgreSQL fixture, protecting active/permanent users. No authenticated global cleanup was triggered against the preview database in this audit, to avoid deleting real expired user data. |

## Executed automated checks

- `npm test`: **70/70 PASS**, including the new cleanup HTTP-handler fixture test.
- `npm run typecheck`, `npm run lint`, `npm run build`: **PASS** after the test changes.
- Protected-preview HTTP/operator suites: **205 PASS** total:
  - `recording-security-smoke.ts`: 34.
  - `clip-security-smoke.ts`: 57, including real source hashes and exact PCM intervals.
  - `locked-surfaces-smoke.ts`: 49.
  - `onboarding-smoke.ts`: 23.
  - `journey-smoke.ts`: 19.
  - `capture-smoke.ts`: 16.
  - final release HTTP checks: 7.
- `auth-secret-audit.ts`: 12 configured secret references; five logs, 480 reachable Git blobs and 44 client assets checked before the audit commit; no configured-secret matches. The final audit reruns this scan; those file counts naturally grow with new commits/builds.
- `check-private-output.mjs`: valid UTF-8 and no configured-secret matches in the candidate text files.
- Log-integrity and unchanged-public-production checks passed.

## Actual browser journeys

1. Existing real recording: owner load, seek/play/pause, complete transcript copying and saved insights. Only counts/booleans/timestamps were emitted, not private speech.
2. Disposable registration: full onboarding with disabled providers/team/Zoom/desktop controls and consent gate; correct avatar; profile has no retrievable password.
3. Generated-credential logout/login and refresh; absolute expiry unchanged. Browser password input values are redacted by the automation surface, so the creation-only Copy password control was used privately in memory for the successful login test. No credentials were printed or photographed.
4. Library search/filter/no-results, all navigation surfaces, dialogs and rewards.
5. Fictional meeting action editing/completion, manual highlight, template persistence and exact fractional clip guest playback/revocation/deletion.
6. Simulation start, pause/resume, four categories and notes, finish, saved insights, annotation seek and cancel.
7. Long transcript search/speaker filter/copy/end navigation, plus 390x844 mobile stacking, eight actions/eight annotations, 52:30 navigation and a fitting, cancellable clip editor. Desktop transcript/sidebar heights matched. Earlier UI tests also covered 800x800, 1024x600, 1280x720 and 1440x900; this audit does not relabel those earlier checks as new executions.
8. Public demo visitor modification, logout and fresh entry: prior change absent.

## Findings and fixes

- **P0: none identified.**
- **P1: none identified.**
- **Verification harness defect corrected:** `journey-smoke.ts` used ordinary fetch even when pointed at the protected deployment, so it initially tested Vercel's perimeter instead of the app. It now uses the same opt-in `AUTH_SMOKE_VERCEL` transport as the other suites. All 19 checks then passed against the actual preview. This was not an application outage.
- Added a focused regression test for cleanup-handler authorization, missing-storage fail-closed behavior, successful fixture deletion, protected active/permanent users and repeat safety.
- No application redesign, new feature, schema migration or integration was added. No additional confirmed P2/P3 application defect required a fix in this audit.

## Remaining limits

- New AI processing remains explicitly budget/recording approved; ordinary new uploads are not an unrestricted billable AI endpoint. The authorized existing result was reused. Additional OpenAI expenditure: **US$0**.
- Upload limit: five minutes/24 MB; no server video transcoding. Shared clips export audio, not video. Boundary utterances can be omitted when word timestamps are unavailable.
- One anonymous model voice label is not verified human identity or proof of diarization accuracy. Completeness/persistence checks do not establish speech-recognition accuracy; no retranscription was made.
- Public demo content and the notetaker/calendar journey are fictional/simulated. OAuth, Zoom, desktop software, premium/team integrations and email-based verification/recovery are intentionally unavailable. Disposable login needs no real email and has no recovery.
- Hour-long performance evidence uses the synthetic transcript fixture, not real hour-long recorded media.
- Signup quotas are global (10/hour and 20/24h). Public demo remains available when new registration is limited.
- Daily cleanup can be delayed by scheduling/storage failures; authorization still expires at the original 24-hour deadline. Buffered/downloaded clips cannot be recalled after revocation.
- The global production cleanup endpoint was not invoked with its secret during this audit; authenticated behavior was tested on isolated fixtures.

## Preservation and cleanup

- Both explicitly created browser audit accounts were removed with exact identity/expiry/recent-creation guards. They held no uploaded recordings. Their fictional mutations and one revoked derived demo-clip artifact were removed.
- The three new real-clip test grants were revoked, removed from meeting state and their derived test WAV objects deleted using exact token-hash/recording/time/path guards. Existing unrelated shares and original media were not selected.
- Public demo sessions used by HTTP suites were signed out; the browser visitor-isolation test discarded the modified visitor session.
- Private credential/identity files stayed ignored; the temporary identity file was removed after cleanup. No recording, transcript, credential, bearer URL or private media was committed.
- Existing Git history and historical log bytes were preserved. The current privacy-sensitive automatic log remains unstaged; capture continues appending automatically.
- Public production, public clip-viewer deployment and dedicated cleanup deployment remain unchanged. Only the protected app preview may be refreshed to include the audit-only commit.
