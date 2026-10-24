# Visual design system — live signed-in account

Evidence: onboarding captures 01–08, main app captures 09–29, and processed-call captures 30–51 in [Screenshot manifest](SCREENSHOT-MANIFEST.md). Measurements are for a 1142 × 1532 desktop viewport and should not be treated as responsive rules. Screenshot colors are approximate because images are JPEG.

## Palette and typography

| Element | Observed treatment |
| --- | --- |
| App canvas | Very dark charcoal, approximately #1A1A1A |
| Header and cards | Dark surfaces differentiated by subtle borders and tone |
| Primary text | Near white; secondary text medium gray |
| Selected navigation and emphasis | Cyan accent |
| Status / trial / promotional elements | Distinct colored chips and illustration panels |
| Body font | Computed Inter, system-ui and fallbacks, 16 px, weight 300 on the My Calls page |

The onboarding uses the same dark canvas, cyan progress bar and accent, dark dropdowns, centered questions, and large outlined or filled buttons. An onboarding preference screenshot sampled the page background near #1A1A1A and dropdown surface near #2D2C31. Exact brand token names were not exposed.

## App shell at 1142 × 1532

A roughly 100 px tall, two-row header spans the viewport. The upper row holds the Fathom logo, a global Search Call Recordings field, Refer, Settings, Help & Feedback, points, and account avatar. The lower row is horizontal navigation: My Calls, Team Calls, Playlists, Alerts, Deals. The My Calls view divides into an approximately 694 px library area and a 448 px Ask Fathom side panel with a 2 px divider. The empty library centers a 'No call recordings' message. Ask Fathom presents a promotional notice, sample prompts, a context selector, and an 'Ask anything…' field. This split is directly observed only on My Calls; do not apply it to other routes by assumption.

Playlists uses a centered empty-state illustration and explanation. Team Calls and Deals show trial gates. Settings is a vertically scrollable form with group headings, cards, dropdowns, toggles, integration tiles, and explanatory helper text. The top navigation remains in place while settings content scrolls.

## Components and observed states

| Component | Visible states / behavior | Evidence |
| --- | --- | --- |
| Navigation tabs | Active cyan emphasis, route change; Alerts returned to My Calls in this account | 17–20 |
| Search | Global input; synthetic query showed Searching… then No matches | 28 |
| Onboarding overlay | Three cards for tutorial, test call, webinar; manual capture and private auto-share status | 09 |
| Tutorial | Six illustrated steps and completion with +5 points; slides are examples, not live call screens | 10–16 |
| Settings dropdown | Dark overlay menus for auto-record, auto-share, summary template, and default link access | 23–26 |
| Toggle | Pill switch with on/off coloring; values inspected but not changed | 21, 27 |
| Trial gate | Modal or dedicated page blocking Team Calls/Deals in this account | 19–20 |
| Populated call card | Large video thumbnail, 4 mins badge, title under Today | 30 |
| Call detail | Centered left 531 px media/content pane and right 343 px detail pane | 31–32 |
| Player | Black 531 × ~300 px surface; volume, time, segmented cyan timeline, 1×, fullscreen | 31–32 |
| Summary | White headings and compact bullet typography, dropdown toolbar, cyan links | 31, 34, 39 |
| Transcript | Stacked cyan/charcoal bubbles, left cyan rail and annotation diamonds, independent scroll | 32, 47 |
| Modal | Dark centered share and customization dialogs over dimmed app | 36–38, 41 |
| Interaction menu | Dark layered dropdown/popover; selected/disabled states visible | 34, 40, 48, 51 |

## Onboarding layout

At 1047 × 900 cropped captures, the centered preference row uses 55 px dark dropdowns and a roughly 360 × 60 px Continue button. A thin cyan progress line runs along the top. The consent checkbox controls Continue enabled state. Role choices are two rows of outlined buttons and use cyan fill when selected. Windows installation offered a Classic card and a bot-free coming-soon card. Captures 01–07 crop the account-email footer; 08 crops it at 1280 × 600.

## Processed call geometry and color

At 1142 × 1532 the call content spans approximately x=113–1009: 531 px left player/content, ~22 px gap, 343 px right details. The app header is about 50 px tall on the detail page. Player top-left is about (113,70), its black media surface about 531 × 300 px, with controls at its bottom. Summary/Transcript/Ask Fathom tabs form a horizontal row below the player. The right title begins at approximately (666,80); Share sits below it, followed by Action Items and Annotations. Main text is white with muted gray metadata, and cyan (#00b9ed–#03bcf2 visually, not a verified CSS token) marks active tabs, timeline blocks, links, plus/diamond controls, and share buttons. Gray and cyan speech bubbles distinguish groups. Summary body looks approximately 13–14 px, section titles about 18 px, meeting title about 20 px; use screenshots as the exact visual reference rather than these estimates. The computed document font is Inter/system sans with 16 px body text.

The transcript panel scrolls independently while the player and right metadata stay fixed in the viewport. Opening a menu overlays its section; share/customization modals dim the entire page. The player spinner remained visible with an Unable to play media accessibility message. Hover/selected behavior was captured on a transcript bubble and annotation card.

## Remaining visual measurements

Working player states, clip composer/viewer, signed-out viewer, mobile/narrow viewport, true speaker change, and broad error surfaces have not been verified. The browser interface did not expose a safe viewport resize during this pass. See [Live call report](LIVE-CALL-RECONNAISSANCE.md).
