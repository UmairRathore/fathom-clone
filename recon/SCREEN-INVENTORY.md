# Screen inventory

Evidence status: **O** observed live in this account, **D** from linked Fathom documentation, **U** not verified. Account identifiers in route patterns are redacted. Screenshot sizes are in SCREENSHOT-MANIFEST.md.

| Screen | Status / route | Visible layout and controls | Tested states / limits | Screenshot |
| --- | --- | --- | --- | --- |
| Capture/share preferences | O /onboarding/customize/auto_record | Logo, progress bar, inline dropdowns, consent checkbox, Continue | Menu choices; unchecked consent disables Continue; manual/Only me approved and selected | 01–04 |
| Job function | O /signup/questionnaire/:id/role | Question and seven two-row buttons | Engineering selected; buttons disabled in transition | 05 |
| Zoom connection | O /onboarding/connect/zoom | Connect to Zoom and Skip | Skip used; OAuth not inspected | 06 |
| Windows installation | O /zoomless/onboarding/download | Classic download card and bot-free coming-soon card | User later installed Classic; no agent download | 07 |
| Finish in app | O /zoomless/onboarding/finish_in_app | Open app instruction and return link | User completed sign-in; /home became accessible | 08 |
| Email/calendar setup | U / unknown | Occurred before investigation | Provider permissions and validation unobserved | — |
| My Calls empty | O /home | Two-row header, global search, My Calls/Team Calls/Playlists/Alerts/Deals tabs; 694 px empty library pane; 448 px Ask Fathom pane | “No call recordings”; Ask prompts and context selector; no populated cards | 09, 17 |
| In-app onboarding overlay | O /home | Tutorial, Start Test Call, webinar cards; capture/share status | Six-slide tutorial completed; no test call started by agent | 09–16 |
| Tutorial slides | O /home overlay | Six illustrated explanations of notification, recording, highlight, recap email, call page, sharing | Illustrations are not live meeting observations | 10–15 |
| Playlists empty | O /playlists | Intro copy and promotional preview image | No playlist exists; no create control visible | 18 |
| Deals trial gate | O /teams/:account/deals | 14-day trial modal over illustrative deal table | Trial not started; underlying demo data not treated as account data | 19 |
| Team Calls gate | O /teams/:account/onboarding/start | Team Edition benefits and Start 14-Day Trial | Trial not started | 20 |
| Alerts | O /teams/:account/alerts navigation | Tab is visible | Clicking returned to /home for this account; no Alerts page verified | — |
| Settings top | O /customize | Auto-record/share selectors; conferencing cards; Premium features | Manual/Nothing persisted; Zoom/Meet partial, Teams full | 21, 23–24 |
| Settings summary types | O /customize | Default template selector (Enhanced selected) | Sixteen choices inspected without changing selection; no generated summary inspected | 25 |
| Settings options/apps | O /customize | Integrations, API access, consent, default link access, apps, highlight colors, delete section | Link default Anyone; two link options; all settings left unchanged | 26–27 |
| Search no match | O /customize header | Search Call Recordings field and inline result popover | Synthetic query showed Searching… then No matches; query cleared | 28 |
| Processed call detail | O /calls/:id | Left player with Summary/Transcript/Ask Fathom tabs; right title, Share, Action Items, Annotations | 4-minute synthetic call; playback spinner/error; no verified media sync | 31–32 |
| Enhanced summary | O /calls/:id | Template, language, copy, customization toolbar; purpose, takeaways, topics and sections | Default selection; links visible but seek effect untested | 31, 34 |
| Project Update summary | O /calls/:id | Issue-oriented alternate structure | Percentage generation state then completed output; default reverted to Enhanced on reopen | 35, 39 |
| Transcript | O /calls/:id | Cyan/gray bubbles, highlight rail, text search, copy, auto-scroll control | Independent scroll; search term reflected in text; speaker attribution and sync incomplete | 32–33, 47 |
| Call Ask Fathom | O /calls/:id | Greeting, four suggested questions, input | No query submitted | 42 |
| Action items | O /calls/:id | Initial None detected; transcript plus menu creates time-linked item in right pane | Generated title, checkbox, Assign, copy controls; no assignee/completion change | 48–51 |
| Highlights and annotations | O /calls/:id | Five blue rail spans and right-column annotation cards | In-meeting capture shown in user-provided image; clip editor and playback unverified | 32, 43, 56 |
| Share modal | O /calls/:id | Add users, owner, access selector, Copy Link | Anyone with link selected; alternate only-added; Share Copy Link unused; access unchanged | 36–38 |
| Global search result | O /calls/search/title | Search suggestion opens Search tab with matching card | Exact-title match; two spoken-content queries returned No matches | 44–46 |
| Classic capture states | O / user-provided images | Start, host search, waiting room, attendee wait, active highlight, ended | User screenshots cropped to remove meeting code and name; not agent-operated | 52–58 |

## Validated app sitemap

Onboarding: Preferences → Role → Zoom connection (skipped) → Windows install → Finish in app → My Calls.

Live navigation: My Calls (/home); Playlists (/playlists); Team Calls → Team Edition trial; Deals → trial gate; Alerts → /home; Settings (/customize). The header also has Refer, Help & Feedback (opens support chat), points, and an account menu (Start Test Call, Tutorial, FAQs, Developers, Privacy Policy, Terms of Service, Security & Compliance, System Status, Download App, Logout). Account email in that menu is intentionally omitted here.

A processed synthetic call was reached from My Calls at /calls/:id. Its player/panel layout is documented in [Live call reconnaissance](LIVE-CALL-RECONNAISSANCE.md). The tutorial illustration remains separate evidence.

Sources for documented-only rows: [Sharing](https://help.fathom.video/en/articles/295616), [Post-call highlights](https://help.fathom.video/en/articles/295680), [Settings](https://help.fathom.video/en/articles/3239617).
