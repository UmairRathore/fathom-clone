# Assessment demonstration notes

## Under-five-minute product walkthrough

1. **0:00–0:35 — Frame the product.** Sounding is a Fathom-inspired educational recreation. Show My Calls, date groups, fictional participant thumbnails, and responsive shell. Explain that the assessment focused on the recording-to-decision workflow.
2. **0:35–1:25 — Playback and transcript.** Open Atlas launch review. Play/pause, set 1.5× speed, select Transcript, click a timestamp near the middle, and show active speaker/segment. Search `rollback`, open its timestamp, and clear search. The 1:46 audio was synthesized locally; timestamps are measured from the WAV, not invented.
3. **1:25–2:10 — Summaries.** Switch Enhanced → Project Update. Show progress then the different issue-oriented headings. Open customization; demonstrate concise or action-focused output. Copy a summary. Say explicitly that demo generation is deterministic and no model call occurs.
4. **2:10–2:55 — Follow-through.** Add an action at a transcript timestamp, assign it, complete it, and refresh to show persistence. Add a Needs Review highlight and click its sidebar card to seek. Storage is isolated per evaluator browser.
5. **2:55–3:40 — Search and sharing.** Search `amber lighthouse` globally; it finds late planning content. Return to launch review, Share → Copy Link, and open the read-only viewer. Point out disabled editing. Explain immutable 24-hour snapshots and the absence of invitations/immediate revocation.
6. **3:40–4:25 — Scale.** Open the eight-speaker planning call at `/calls/quarterly-planning?t=3540`. Show 59:00, eight distinct speaker names, search, and fast navigation. Explain that this is a synthetic 60-minute transcript without audio. Only a small measured window of its 240 rows is rendered.
7. **4:25–4:50 — Engineering.** Show test/build results, modular architecture, automatic capture logs, and the verified deployment URL when available. Mention localStorage + encrypted snapshots as the deliberate database-free demo choice.

## Separate one-minute introduction

Use your own voice, background, and experience. Suggested structure: name and engineering focus (10 s), the product problem (15 s), the core implementation decisions (20 s), what you would build next for production (15 s). Do not claim experience, metrics, or contributions that are not yours.

## Be precise about the boundaries

- Real: browser audio playback and seeking, actual content search, editable/persistent actions and highlights, virtualized transcript, authenticated/encrypted guest snapshots, production Next.js build.
- Simulated/seeded: people, meetings, speaker attribution, transcript, summaries, Ask answers, and a one-hour timeline with no corresponding recording.
- Not connected: live conferencing capture, calendar, AI inference, authentication, database, invitations, CRM, or clip creation.
- Source fidelity: desktop reference geometry and observed menus/colors/layout; mobile, playback synchronization, guest viewer, and scale behavior are independently designed.
- Publication: do not call the demo live until the public HTTPS deployment has been opened and verified.

No external assessment submission or video recording has been performed by the agent.
