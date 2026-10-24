# Evidence-backed 24-hour implementation plan

**Planning document only. No application scaffold, database model, or feature code has been created.** The web shell, settings, and one processed synthetic call are now observed. This plan prioritizes the official 8x core flow and explicitly carries forward the playback, clip, and speaker-attribution gaps. Do not use undocumented assumptions as visual requirements.

## Scope decision

P0 is a coherent, functional journey: meeting library → simulated capture/processing → processed call → playable media synchronized with a long transcript → at least two summary formats → action items → highlights/clips → search → controlled external viewer. Clearly disclose that conferencing capture/AI output is simulated if it is. P1 is settings/onboarding fidelity and secondary navigation. P2 is team administration, billing, CRM, and deep integrations. This order follows the official brief and the observed app shell/call detail.

## Proposed execution order once research is complete

| Window | Work | Exit criterion |
| --- | --- | --- |
| Hours 0–2 | Review actual captures 17, 30–51; lock desktop geometry, labels, content hierarchy, and synthetic fixture | Call detail shell reflects observed 531/343 px pane arrangement; no invented controls |
| Hours 2–5 | Set up Next.js App Router, TypeScript, Tailwind, and a small component system based on observed screens | App shell and library at desktop viewport visually match reference |
| Hours 5–9 | Seed realistic synthetic meetings including 60-minute eight-speaker stress case; build Today-grouped library, call detail, and clearly simulated processing | Every card opens a coherent detail; empty/populated states match evidence |
| Hours 9–14 | Implement playable media and timestamped transcript sync; seek, active segment, scroll, speaker labels | Playback/timestamp navigation works at early/middle/late points |
| Hours 14–17 | Add Enhanced and Project Update summary structures, percent generation transition, action-item empty/manual states, highlight rail and menus | Two formats differ visibly; manually added item is time-linked and appears in both panes |
| Hours 17–19 | Add title/transcript search and controlled read-only share viewer for synthetic content | Title and phrase queries navigate correctly; access choice governs viewer |
| Hours 19–21 | Responsive polish, accessibility, empty/loading/error states | Desktop and narrow-screen paths remain usable |
| Hours 21–24 | Validate, deploy, inspect production, record under-five-minute camera-on walkthrough plus separate one-minute introduction | Public app, public repo with agent logs, videos, and stated simulation boundary are ready |

## Candidate architecture, to validate after observation

Use Next.js App Router, TypeScript, React, Tailwind, and shadcn/ui primitives where they match the actual screenshots. Start with local seeded state for fast, deterministic UI work. Add simple server-side persistence only for state that must survive refresh or support a public synthetic share URL. PostgreSQL with Prisma or Supabase is a later choice; **no database schema is specified in this reconnaissance phase**. Avoid building real Zoom/Meet/Teams integrations under the 24-hour limit unless the assessment explicitly demands them; represent capture and processing as a clearly disclosed simulation.

Keep responsibilities separate: library/search, call detail/media, transcript synchronization, summary formats, action items, highlights/clips, and access-controlled viewer. Use timestamped transcript segments and a deterministic media fixture. For the hour-long case, seed eight synthetic speakers and hundreds of segments; keep media/transcript time in one source of truth and render long transcripts efficiently. Do not copy private Fathom meeting content.

## Minimal verification after implementation

1. A seeded meeting opens from the library; empty and processing states are coherent.
2. Play, pause, seek, and transcript-timestamp click update the same playhead. Verify active segment at beginning, middle, and end.
3. Summary switching changes content; action-item completion and highlight creation behave as labeled.
4. Search finds a unique phrase in an early and late segment and opens the correct call/time.
5. A synthetic share link opens in a signed-out window with only intended information.
6. The 60-minute/eight-speaker fixture scrolls and seeks without freezing or losing selection.
7. Review the public deployment and repository for personal account details, credentials, and private screenshots before submission.

## Dependencies before coding

The two-account synthetic call has been processed and inspected. The My Calls shell, populated card, call page, transcript structure, two summary formats, manual action-item flow, highlight affordances, title-search results, and share modal are measured. Working playback and transcript synchronization, true second-speaker labels, clip editor/viewer, signed-out viewer, and responsive behavior remain unverified. Those gaps must be either checked before implementation or marked as approximations in the assessment; they must never be represented as observed Fathom behavior. See [Live call reconnaissance](LIVE-CALL-RECONNAISSANCE.md), [Open questions](OPEN-QUESTIONS.md), [Feature matrix](FEATURE-MATRIX.md), and [Screenshot manifest](SCREENSHOT-MANIFEST.md).
