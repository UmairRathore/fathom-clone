# Sounding assessment guide

**[Open Sounding](https://fathom-clone-three.vercel.app)** · [README](../README.md) · [Submission audit](SUBMISSION-AUDIT.md)

This guide describes the public application released from `98d7a46` on 2026-10-25. Production needs no Vercel account. Development previews still require authorized Vercel access.

## Choose how to enter

### Try Public Demo

Open the sign-in page and choose **Try Public Demo**. No name, email or password is needed. The library contains four fictional meetings. Changes to actions, highlights, clips and preferences are isolated from other visitors. Logout and demo reentry start a fresh visitor workspace. Demo entry does not grant access to private user recordings or billable AI processing.

### Create a 24-hour account

1. Choose **Create account** and enter a display name. No real email address is collected.
2. The welcome screen provides a generated login ID and a masked password. Reveal/copy them or explicitly download your credentials privately before continuing. The password is available only on this creation screen; leaving or refreshing clears it.
3. Complete the personal-workspace onboarding. Review recording/sharing preferences and acknowledge attendee-consent responsibility. Continue is disabled until consent is checked. Choose a job role, then use **Skip** for unavailable Zoom and desktop-install steps.
4. Your private workspace persists across refreshes and subsequent logins. Your account/profile shows your login ID and exact expiry time. Display-name changes update the avatar initial.
5. Log out, return to sign in, and use the generated login ID and password. Reopening a browser with a valid session retains access; otherwise sign in again.

The ID resembles an email address but is an internal identifier, not a mailbox. Only a salted password hash is stored. There is **no email verification or password recovery**. If you lose your credentials, create another account; the previous workspace is not transferred. Do not include credentials in screenshots, demo videos, public issue reports or agent prompts.

The account has a **fixed 24-hour lifetime measured from creation**. Logging in again does not restart it. Sessions, private media access and new share links cannot extend that deadline. Background deletion occurs later through the daily cleanup job; delayed deletion does not extend access. Registration has conservative global free-resource quotas, so demo entry is the fallback if new-account creation is temporarily limited.

Google/Microsoft/SSO buttons, team/premium integrations and unavailable connection/download controls are intentionally disabled. They do not initiate OAuth, billing or external permissions. The assessment focuses on the meeting-to-insights workflow without requiring evaluator accounts at other services.

## Explore the meeting library

Open **My Calls**. Search across meeting titles, participants, summaries and transcript content. Filters and no-results feedback are functional. Open **Atlas · Product launch review** for real synchronized playback of fictional content.

The launch fixture has 106.1 seconds of synthesized speech and four scripted participants. Click transcript timestamps to seek; try playback speed, speaker filters, transcript search and jump-to-time. Active transcript tracking respects manual scrolling. Desktop transcript and insights columns scroll independently; narrow screens stack naturally.

Switch **Enhanced** and **Project Update** summary templates, inspect timestamp evidence, and add/assign/complete an action. Add a manual highlight and select it to jump back to its moment. Fixture summary generation is deterministic. Ask uses seeded/keyword answers rather than a general conversational AI model. Uploaded recordings use cached approved AI output. Automatic insights and manually created highlights retain distinct provenance.

All four preloaded meetings are fictional. An actual private recording processed during development is not shared with evaluators. Your private uploads and other accounts' recordings never appear through the public demo.

## Create and share a clip

1. In the launch review, open **Create Clip** from the meeting or an annotation.
2. Set a title and a start/end range. For example, 13.125–17.375 seconds is a valid 4.250-second range. The permitted duration is 0.1–120 seconds within the recording.
3. Use **Preview**, then **Save**. Saved clips are available in the insights/sidebar area.
4. Choose **Share clip** and explicitly create a link. Open it in an unauthenticated browser to verify the guest view. Do not paste the bearer URL into public documentation or logs.
5. Revoke it to block subsequent page/media requests. Editing or deleting the source clip also invalidates the link.

The guest viewer is public at the separate clip-viewer origin. It exposes only the selected excerpt and contained transcript utterances. Export is standalone WAV **audio**, not video. Where word timestamps are unavailable, transcript selection includes complete contained utterances. Transcript-only fixtures can produce transcript excerpts but no playable media. New links expire within 24 hours and are capped by temporary-account expiry; downloaded/buffered media cannot be recalled.

Private-recording sharing requires explicit owner consent. Whole-meeting sharing is available only for fictional meetings, not private uploads. No Sounding login is needed to read a valid guest link.

## Simulate a notetaker and highlight live

From My Calls choose **Start recording simulation**. Connect the demo calendar, add the demo notetaker, and admit/start the simulation. Add a highlight or another supported annotation while the timeline advances; optionally include a note. Pause/resume saves position. Accelerated replay lets you finish quickly. Finish the recording, prepare demo insights, then open its recording/detail page and follow a saved highlight.

This is explicitly a fixture replay: no Google Meet bot, calendar permission, microphone capture, new real recording or paid inference is invoked. It demonstrates admission, recording state, mid-call annotation persistence and the handoff into transcript/insights review. The assessment permits stubbing the recording bot.

## Check long-meeting usability

Open **Atlas · Q4 cross-functional planning**, the synthetic **60-minute, eight-speaker, 240-segment** fixture. Jump near 59:00, filter speakers and search for `amber lighthouse`. Scroll both desktop panels and resize the browser. The transcript is virtualized so the full hour does not require rendering every row at once.

This fixture has **no audio or video**. Playback is disabled deliberately. It demonstrates navigation and long-transcript usability, not real eight-person capture, speaker recognition or full-hour transcription accuracy. Use the launch review to test actual audio synchronization.

## Uploading and AI processing

**Upload Recording** is available to private accounts through My Calls/navigation. Public demo sessions cannot use it. Supported inputs are MP4/WebM with audio and MP3/M4A/WAV, limited to five minutes and 24 MB. Cloud storage and processing require server configuration.

Billable OpenAI processing is restricted to an explicitly approved recording and database budget authorization. Uploading an arbitrary file or having an API key does not grant permission to spend credits. Evaluators should use the ready fictional demo for the complete product walkthrough. No additional paid request is required to assess it.

The authorized development recording completed genuine transcription, structured analysis and original playback. Recognition accuracy has separate limitations: saved segment coverage does not prove every word is correct, anonymous diarization is not identity verification, and technical-word recognition is imperfect. No private transcript or recording is included in this guide. See [processing evidence](REAL-AI-PROCESSING.md) and [recognition review](RECOGNITION-ACCURACY-AUDIT.md).

## Suggested five-minute walkthrough

| Time      | Action                                                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:40 | Enter Try Public Demo; show My Calls and cross-meeting search. Explain fictional fixtures and isolated visitor changes.                              |
| 0:40–1:35 | Open launch review, play audio, seek from a transcript timestamp, filter/search, and show active tracking.                                           |
| 1:35–2:15 | Switch summary templates; add/complete an action and create a manual highlight. Explain deterministic fixture insights.                              |
| 2:15–3:10 | Create a short clip, preview/save, and open its guest link privately; demonstrate revocation.                                                        |
| 3:10–4:10 | Run accelerated recording simulation, save a live highlight, finish and open insights.                                                               |
| 4:10–5:00 | Open the hour-long eight-speaker transcript, jump near the end, search and resize. Explain absent long-fixture media and restricted paid processing. |

Separately, test name-only registration → save credentials → onboarding → logout → generated-credential login. This exercises real authentication without consuming most of the product walkthrough. Keep the credential screen out of any public recording.

## Verified scope and submission caveats

The application revision passed 70 automated tests, TypeScript, lint, production build and 148 production HTTP/operator checks. Release-candidate browser testing included onboarding and generated-credential return; post-release browser checks included public/demo entry, audio seeking and mobile layout. See the [README release evidence](../README.md#tests-and-verified-release).

These results do not certify a general-purpose production SaaS, independent full-recording speech accuracy or a newly observed scheduled cleanup execution. Historical reports describe earlier milestones. The owner has authorized test-transcript publication, but public agent logs remain incomplete because a Google reauthentication token in the active file has unverified invalidation status; [the submission audit](SUBMISSION-AUDIT.md) documents the exact gap and the required assessment-owner decision.
