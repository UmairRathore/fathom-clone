# Assessment journey audit

> **Historical milestone report.** The complete application was publicly released from `98d7a46` on 2026-10-25. Earlier preview-only, deployment, authentication and test-count statements below describe that milestone. Use the [current README](../README.md) and [assessment guide](ASSESSMENT-GUIDE.md) for present behavior; the original report body is retained as evidence.

Audited 2026-10-25 on `codex/authentication-preview`, starting at cc96f68, against the exact requirement:

> Connect a calendar, get the notetaker into a real meeting, let it record, watch playback against the transcript, read the AI summary, switch templates, pull action items, highlight a moment mid-call, search across meetings, share a clip externally, and test an eight-person hour-long meeting.

The assignment permits stubbing the recording bot. The implementation uses that allowance explicitly. No calendar permissions, live conference bot, microphone permission, transcription service, or AI infrastructure was added.

Status: **Functional** = implemented behavior verified with actual data or media; **Simulated** = working fixture-driven substitute, labeled in the UI; **Partial** = some required behavior works with material limitations; **Missing** = absent.

## Verified baseline before changes

| Requirement                 | Status                                     | Code and browser evidence                                                                                                                            | Critical gap                                                                                              |
| --------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Connect calendar            | Missing                                    | Dashboard has only existing seeded meetings; no calendar route or connection state                                                                   | No entry into the recording journey                                                                       |
| Admit notetaker to meeting  | Missing                                    | No waiting-room/admission flow or recording controller                                                                                               | Permitted bot stub was not implemented                                                                    |
| Let it record               | Missing                                    | `data.ts` loads prebuilt assets; no capture lifecycle                                                                                                | Cannot experience recording → processing → insights                                                       |
| Playback against transcript | Functional for short demo; partial overall | Atlas Play changed to Pause; playback advanced; transcript timestamps and synchronized active segment exist in `media-player.tsx` / `transcript.tsx` | Only 106.10771 seconds of synthesized speech; avatar tiles are not video                                  |
| AI summary                  | Simulated                                  | Clearly labeled seeded deterministic summaries; `summary-service.ts`                                                                                 | No transcription or inference; no arbitrary input support                                                 |
| Switch templates            | Functional with simulated content          | Browser changed Enhanced → Project Update and rendered ATLAS-142/156/163 sections                                                                    | Content remains deterministic                                                                             |
| Pull action items           | Partial                                    | Existing seeded items support owners, completion, edit, timestamp jump; authenticated JSONB persistence                                              | No extraction from arbitrary recordings; no dedicated action export                                       |
| Mid-call highlight          | Missing                                    | `meeting-view.tsx` opens `EntryEditor` only from completed transcript                                                                                | No live recording context                                                                                 |
| Cross-meeting search        | Functional                                 | Browser query `regression` retained Atlas and removed other cards; code indexes title, people, transcript, summaries                                 | Search corpus is fictional fixtures, not calendar imports                                                 |
| External clip share         | Partial                                    | Share modal and `/api/shares` implement authenticated whole-meeting, encrypted 24-hour guest snapshots                                               | No start/end selection, saved clips, bounded guest playback, or audio export                              |
| Eight-person hour           | Partial                                    | Browser showed 240 segments / 8 speakers; `amber lighthouse` returned 30 matches beginning at 52:30; Play disabled                                   | Transcript-only synthetic hour; no corresponding recording; no speaker selector or direct timestamp input |

Baseline browser environment: local Next app on port 3002, real Neon-backed session, isolated demo workspace. A native select helper reported a retention error during async template generation; subsequent UI confirmed Project Update selected and its distinct content rendered. No false claim of a failed template switch.

## Smallest plan, implemented in vertical slices

1. Protected `/capture`: simulated calendar connection → stub admission → replay clock with pause/checkpoint and live highlights → processing → existing recording/insights. Store optional lifecycle state alongside the existing meeting state; reuse owner checks and demo isolation. Keep the original fixtures available for direct review.
2. Save named clip ranges from the current playhead or any annotation. Validate and persist bounds. Mint an authenticated clip snapshot using the existing 24-hour encryption system. Render only selected transcript utterances and extract standalone PCM audio for the guest. Preserve existing whole-meeting shares and their v1 tokens.
3. Add speaker filtering, direct m:ss navigation, next/previous search matches, and action-item export. Test the long fixture through both replay and transcript exploration.

No schema migration or authentication changes are necessary: optional fields preserve existing JSONB states and whole-meeting snapshot compatibility. No production deployment or historical log edits form part of these slices.

## Resulting feature matrix

| Requirement                       | Result                                                               | Scope / remaining gap                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Calendar connection               | Simulated                                                            | Sample calendar and upcoming fixture; no external permissions or calendar import                                              |
| Notetaker admission               | Simulated                                                            | Explicit waiting room and admit action; no real meeting connection                                                            |
| Recording → processing → insights | Simulated                                                            | Persisted ordered UI lifecycle; 1×/30×/120× replay, explicit skip, checkpoints, processing handoff; prerecorded fixtures only |
| Playback/transcript               | Functional for Atlas; partial for hour                               | Existing synchronized synthesized audio preserved; no actual call video or hour audio                                         |
| Summary                           | Simulated                                                            | Deterministic fixture summary, labeled; no AI inference                                                                       |
| Template switch                   | Functional with simulated content                                    | Existing formats and saved preferences preserved                                                                              |
| Action items                      | Functional editing/export; simulated extraction                      | Download current completion states, owners and source times; seed-based extraction only                                       |
| Mid-call highlight                | Functional within recording simulation                               | Saves current utterance and checkpoint into workspace annotations; then available for clip creation                           |
| Cross-meeting search              | Functional                                                           | Existing fictional corpus; no new calendar corpus                                                                             |
| Create/share clips                | Functional for fixture audio; transcript excerpts for other fixtures | Named persisted ranges; preview; cookie-free 24-hour viewer; standalone WAV download; no video editing/transcoding            |
| Eight-person hour                 | Functional transcript usability; simulated recording journey         | 240 segments, 8-speaker filter, timestamp jumps, search match navigation, accelerated replay; no real eight-person recording  |

## Sharing boundaries

- Clip endpoints use authenticated encrypted share payloads, validate range against the server-owned fixture, reject restricted/expired/tampered tokens, and require no Sounding session for guest viewing.
- A clip audio response contains selected PCM frames only, not a URL to the whole recording. The original fictional Atlas asset is already public by design; clip sharing does not turn it into private media.
- Transcript boundaries preserve whole intersecting utterances for context; boundary timestamps are clamped. This is disclosed in the viewer; word-level transcript timing does not exist.
- Existing immutable links still expire after 24 hours. Restricting future shares does not revoke previously minted snapshots. No account invitations are implied.
- Vercel preview protection remains in place. Local cookie-free access does not prove public access through Vercel's platform authentication. Production remains unchanged.

## Verification

Automated: 26 passing tests including existing authentication, isolation, reset and domain suites plus five new journey/media tests. New HTTP verification (`scripts/journey-smoke.ts`): 18 passing checks including guest access, exact 16-second WAV, persistence, visitor isolation, unauthenticated/cross-origin denial, restricted shares, invalid bounds and invalid tokens. Bearer share URLs/cookies remain only in process memory and are not printed.

### Browser verification

- Atlas: connect calendar → schedule stub → admit → recording replay; live highlight at 0:02 saved the current utterance; pause/checkpoint restored after reload; explicit fixture completion → processing → ready → existing insights. The annotation survived the handoff.
- Clip: created from the live annotation; reversed 29–13 second range was rejected. A valid 0–13 second audio preview played (audio `paused=false`); saved named clip appeared in the sidebar and opened its clip-specific sharing dialog. Separate viewer rendered one utterance and played a 13-second audio asset (`paused=false`, duration=13), without full-meeting summary content.
- Hour scenario: selected 8-person / 60-minute fixture, connected calendar, admitted stub, ran accelerated replay to 60:00, saved a live highlight around 46:03, prepared 240-segment insights. This is accelerated fixture playback, not a real one-hour live recording test.
- Long transcript: Chris filter yielded 30 segments, all mounted speaker labels Chris Morgan. Invalid 61:00 jump showed a range error. Valid 52:30 jump selected the expected utterance, cleared filters, and restored 240 segments with 11 mounted rows. `amber lighthouse` yielded 30 matches; Next match advanced to 52:45 with 8 mounted rows. These are observed DOM counts, not a measured latency/memory benchmark.
- Downloaded action-items file contained 8 items, participant owners, completed-state markers and the 53:00 source timestamp.
- Fresh production-built local `/capture` loaded with zero browser console errors/warnings. Earlier development logs included a transient missing-brace compilation error during file creation; it was fixed before the passing build/tests. No claim of an error-free editing session.

### Final verification and preservation

Production build, TypeScript, ESLint, formatting and all 26 tests passed. Both HTTP suites were also run against the final local production build: 18 journey/clip checks and 23 authentication regression checks. Existing real-email delivery remains disabled and no OAuth/calendar credentials were requested or changed.

Screenshots: `docs/screenshots/journey/clip-viewer.jpg`, `hour-insights.jpg`, `long-transcript.jpg`. Captured directly from the app with no pixel alterations; files use JPEG encoding matching their extension. They contain fictional content and no bearer URL, session cookie or secret value.

Existing `main` and `origin/main` remain at 7cf99f9. No force push, history rewrite, production deployment, database replacement, hook edit or manual automatic-log edit was performed. The new state is optional and stored in the existing isolated workspace rows. The original public deployment and protected auth preview remain as previously deployed; these additions run locally on port 3002.
