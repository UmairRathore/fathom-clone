# Workflow map — observed and unverified

Evidence labels: **Observed in browser**, **User-provided capture**, **Documented** (Fathom help only), **Unverified**. The only call inspected was the user's synthetic two-account Google Meet recording. The full evidence is in [Live call reconnaissance](LIVE-CALL-RECONNAISSANCE.md) and [Screenshot manifest](SCREENSHOT-MANIFEST.md).

## Onboarding to library

Observed in browser: signed-in preferences → approved manual capture and Only me → consent acknowledgement → Engineering role → skipped Zoom connection → Windows Classic installation gate → desktop sign-in completed by user → /home My Calls accessible. Web Settings later confirmed **No meetings. I'll record manually** and auto-share **Nothing**. The exact earlier email/calendar authorization flow remains unobserved. The settings page showed Teams Fully Enabled and Zoom/Google Meet Partially Enabled.

## Synthetic capture and processing

User-provided Classic screenshots show the manual **Start Recording** control, then Looking for host, Recorder in waiting room, Awaiting Attendees, an active Highlight panel, and Meeting Ended with a **View Recording & Summary** button. The active panel offers End/Pause recording, four highlight types, an End Highlight button, auto-end-after-current-speaker toggle, and title input. A maintenance notice appeared during prejoin. The user completed the meeting; by the time browser inspection began, the card was already processed in My Calls. The intermediate web processing state was not observed. No agent started or stopped a recording.

The completed call appeared under **Today** with a thumbnail, title, and **4 mins** badge. Clicking it opened /calls/:id. The call page showed player, Summary/Transcript/Ask Fathom tabs, right-hand Share/Action Items/Annotations. Its five in-meeting highlights were represented in both the transcript rail and right annotations. The player stayed at 0:00 with an **Unable to play media** accessibility state in the in-app browser. Playback and synchronization are therefore unverified, despite visible controls. The in-meeting screenshot reported Talk Time 100% and Monologue 1; the page shows two bubble colors but no unambiguous second speaker label in the inspected viewport.

## Summary, transcript, action items

Observed in browser: Enhanced summary loaded by default. Choosing Project Update displayed a percentage generation state and produced issue-oriented output; reopening the call showed Enhanced by default again. Template, language, customization, and copy controls were inspected without changing account defaults or submitting a custom instruction. The transcript scrolls inside its left panel, shows cyan/gray bubbles, a highlight rail/diamonds, search, copy, and auto-scroll controls. A clicked bubble selected visually. An in-call search term appeared in the transcript text but did not visibly seek the failed player.

The call initially reported **None detected** under Action Items even though task statements were spoken. The transcript plus menu exposed Action Item, Bookmark, disabled Comment, and four highlight types. Selecting Action Item at **3:29** created a time-linked item, then generated a title. The right panel gained a checkbox, Assign, Copy for…, and Copy Follow-up Email. Assign showed DEV051; no assignment or completion change was made. No post-call highlight or clip editor was created.

## Search and sharing

Observed in browser: global search first shows Searching…. The exact call title yielded one titled-call suggestion; selecting it opened /calls/search/title?input=… with the call card and Search navigation selected. Two spoken-content queries, MeetingFlow and SaaS, returned No matches. Search indexing timing and other fields remain unknown. My Calls has a separate Ask Fathom pane; call detail has an Ask Fathom tab. No AI question was submitted.

The Share Recording modal lists an owner, add-users field, access selector, and Copy Link. **Anyone with the link can view** was already selected; **Only people added can view** was the other visible choice. This setting is distinct from auto-share Nothing. The agent did not add a person, use Share modal Copy Link, change access, send email, or open an external viewer. An annotation link icon was activated once with unverified effect. User approval is still needed before any actual external access or link publication.

## Eight speakers for sixty minutes

No real Fathom example was available. The official assessment's scale case remains a clone fixture, not an observed product behavior. A test fixture should include eight named synthetic speakers, a 60-minute timeline, hundreds of transcript segments, distributed highlights/action items, and unique terms near the beginning, middle, and end. Verify transcript scrolling and seeking against the clone's media. Do not claim that fixture measures Fathom's performance.

## Product-version boundary

The user-operated test used Fathom Classic's recorder. The live Windows onboarding labels bot-free capture Coming Soon to Windows. Features documented for Fathom 3.0 should not be assumed for this Classic flow. [Desktop App](https://help.fathom.video/en/articles/449088), [Marking Highlights](https://help.fathom.video/en/articles/295424).

## Still unverified

- Working playback, pause/seek, timestamp click, active-segment synchronization, captions, and speed behavior.
- Clear second-speaker attribution; the test used one human with two accounts.
- Positive spoken-content global search after indexing; search by participant, summary, action item, date, or highlight.
- Clip editor, clip playback, share-link behavior, and signed-out viewer.
- Web recording-processing state, mobile/narrow viewport, and hour-long eight-speaker Fathom behavior.
- Hidden API calls, payloads, persistence mechanics, and backend data model; none were inspected.
