# Open questions and required user actions

The items below are explicit gaps. No meeting or app behavior is claimed to have been tested unless marked observed in the other reports.

## Completed synthetic-call gate

The user installed and signed in to Fathom Classic and completed a two-account synthetic Google Meet recording. The processed 4-minute call was inspected in My Calls. In-meeting evidence came from user-supplied screenshots; web-call evidence came from the authenticated browser. No agent-controlled recording or external sharing occurred. Any external-viewer test still needs separate approval for the exact access setting and recipient. See [Live call reconnaissance](LIVE-CALL-RECONNAISSANCE.md).

## Onboarding and account

- What happened in the personal-versus-work email and calendar authorization steps before the current screen? What exact permissions, validation, and error states were shown?
- Resolved: Settings shows No meetings. I’ll record manually and auto-share Nothing after onboarding.
- Resolved in this account: after user installed/signed in, /home became accessible. The onboarding overlay offers a Start Test Call and six-slide tutorial.
- Resolved for Google Meet: skipping Zoom did not prevent the user’s Google Meet Classic recording. Teams was not tested.
- Does the test account have a trial period that changes free-plan access?

## Main application and settings

- Resolved for desktop empty state: My Calls, Team Calls, Playlists, Alerts, Deals; /home split 694/448 px at 1142 px viewport. Hover and responsive states remain unknown.
- One processed card appeared under Today with a video thumbnail, 4 mins badge, and title. Multi-card ordering, filters, and other metadata remain unknown.
- Resolved in part: /customize shows conferencing, capture/share, templates, integrations, API/MCP, link access, and app links. Exact paid restrictions and transcription-language behavior remain unknown.
- Web recording-processing was missed after the user finished; summary regeneration showed percent progress. The player consistently displayed a spinner and Unable to play media in this browser. Is playback functional in the user’s regular browser?

## Processed call

- Resolved at desktop: left player plus Summary/Transcript/Ask Fathom tabs, right title/share, Action Items, and Annotations. Exact mobile layout remains unknown.
- Do playback and transcript scroll synchronize? Does clicking a segment or timestamp seek? Is there active highlighting, speaker color, auto-scroll, search in transcript, speed, caption, copy, edit, or trim?
- Resolved in part: Enhanced and Project Update generated distinct structures; switching showed percent progress. Summary customization and copy controls visible. Editing or copying output was not tested.
- This call initially showed None detected despite task speech. A manual 3:29 item gained an AI title; checkbox and Assign appeared. Completion, edit, export, and broader assignee options remain unverified.
- User-provided Classic screenshot shows an active in-meeting highlight and five resulting annotations. Post-call plus menu was inspected, but a post-call highlight and separate clip editor were not created/tested.

## Search, sharing, scale

- Exact-title query found the call and navigated to Search results. Spoken-content terms returned No matches; indexing timing, other fields, and filters remain unknown.
- Share Recording modal observed: owner, add-user field, Anyone with link selected, Only people added alternate, Copy Link. The Share modal Copy Link action was not used; an annotation link icon was activated once with unverified effect. Clip-share dialog and signed-out viewer remain unknown.
- How does the actual product handle a one-hour recording with eight speakers? No genuine example is available. Do not infer Fathom's performance from the proposed synthetic clone fixture.
- Can this browser's supported inspector reveal safe network request metadata without exposing tokens? No request bodies/endpoints have been collected.

## Assignment coverage audit

| Official requirement | Current status | Next proof |
| --- | --- | --- |
| Calendar connection | Settings shows Teams Fully Enabled; Google Meet and Zoom Partially Enabled; calendar status unknown | Inspect safe account connection state |
| Real Zoom/Meet/Teams meeting + notetaker | User-created synthetic Google Meet with Classic recorder; in-meeting crops retained | No further capture needed for base flow |
| Recording and processing | User completed recording; 4-minute processed card observed; web processing stage missed | Working playback and processing state |
| Playback and transcript synchronization | Player showed Unable to play media; transcript/controls visible but sync blocked | Retry playback in compatible authenticated browser |
| AI summary and two templates | Enhanced and Project Update generated structures captured | Only deeper edit/copy behavior pending |
| Action items | Auto none; manual action item at 3:29 captured | Completion/edit/export pending |
| In-meeting/post-meeting highlight | Five in-meeting highlights and post-call plus menu captured | Clip editor/playback pending |
| Cross-meeting search | Title positive; transcript terms negative | Indexing and other fields pending |
| Clip sharing/external viewer | Share modal inspected; no link or viewer opened | Separate approval for access/viewer |
| Eight speakers / one hour | No real-product test | Documented limits plus synthetic stress fixture |
| Visual system and screenshots | Onboarding, shell, processed call, menu/modal/loading states, title search captured | Working playback, clip viewer, narrow viewport |
| Functional/seed requirements | Evidence-backed prioritized plan | Implement only after recon phase ends |

When these items become available, update the reports rather than silently replacing “unverified” with an assumption.

## Audio-recording setting check (24 October 2026)

The web Settings page still reports “No meetings. I’ll record manually,” so auto-record is off. This does not disable a manual recording started in the Classic app. No distinct audio-only switch was visible in the inspected web Settings. A current lower-settings screenshot is 29-settings-options-before.jpg; auto-record choices were previously captured in 23-settings-auto-record-menu.jpg. An attempted navigation from the Desktop App Configure button was blocked by browser security policy, so the agent did not inspect or change desktop audio settings. No account setting was changed during this check.
