# Sounding · Your meetings, remembered

An independent Fathom-inspired assessment project for reviewing recordings, searching transcripts and turning conversations into decisions. All sample people, meetings and content are fictional. Sounding is not affiliated with Fathom.

- **Original public demo:** [fathom-clone-three.vercel.app](https://fathom-clone-three.vercel.app)
- **Authentication preview:** [sounding-preview-umair-rathore.vercel.app](https://sounding-preview-umair-rathore.vercel.app)
- **Source:** [UmairRathore/fathom-clone](https://github.com/UmairRathore/fathom-clone)
- **Auth branch:** `codex/authentication-preview`

The original production deployment remains unchanged. Authentication changes are isolated to the preview and its dedicated Neon Free Plan database. Vercel Deployment Protection remains enabled; the preview requires authorized Vercel access. Once admitted, “Try the public demo” creates an isolated Sounding visitor workspace.

## What works

- Responsive meeting library with date groups, filters and search across titles, people, summaries and transcript content.
- Real playback of a locally generated 106.1-second fictional spoken recording; seekable transcript, speaker filters, active-segment tracking, playback speed, mute and fullscreen.
- Eight-speaker, one-hour transcript fixture with 240 segments and virtualized rows. It intentionally has no recording; playback is disabled.
- Distinct Enhanced and Project Update summaries, concise/full and focus options, timestamp citations and deterministic seeded Ask responses.
- Editable/assignable/completable action items; categorized highlights; timestamp links; transcript copy/download.
- Real database-backed login, session cookies, verification-gated email signup, logout, session expiration and private profile-name management.
- Private account workspaces persisted in PostgreSQL; separate demo changes per sign-in session; explicit save status and revision conflict handling.
- Encrypted immutable 24-hour read-only share snapshots. Creating links requires an owner session; reading links requires no Sounding session. Preview platform protection still applies.

Google OAuth is prepared and visibly disabled until credentials are configured. Real email signup, verification delivery and password-reset email are deliberately disabled until an email provider is configured and tested. Full library flows are tested using a mailbox held only in test-process memory. No fake login, generated recovery email or working Google integration is claimed.

## Quick start

Node.js 24.x is required. Dependencies are pinned by package-lock.json.

```sh
npm ci
npm run dev:auth
```

Open http://localhost:3002. This starts a local PostgreSQL engine and app without needing hosted credentials. Generated keys and database files are ignored by Git. It is a local development option only.

With a configured dedicated PostgreSQL connection in ignored .env.local:

```sh
node scripts/setup-auth-env.mjs
npm run db:migrate
npm run dev -- --port 3002
```

The setup helper preserves existing secrets and defaults BETTER_AUTH_URL to http://localhost:3002. Use the one-click demo to enter without disclosing a password. DEMO_EMAIL and DEMO_PASSWORD also support actual credential login; the configured password is kept server-side and out of public Git history.

For a production build:

```sh
npm run build
npm start -- --port 3002
```

See [authentication architecture and provider setup](docs/AUTHENTICATION.md) for exact configuration, recovery enablement and maintenance instructions.

## Validation

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run test:neon
npm run test:auth:http
```

21 automated tests pass, including media timing, transcript lookup, search, state validation, sharing, real credential/session behavior, authorization, isolated demos, CSRF, rate limits and reset-token expiry/reuse.17 additional hosted PostgreSQL checks pass against the dedicated Neon preview database.23 local production HTTP checks pass against Neon.

The original unprotected demo smoke script remains in scripts/smoke.ts for that release. The authentication branch uses scripts/auth-smoke.ts. Authorized checks against the protected Vercel preview use:

```sh
AUTH_SMOKE_VERCEL=true SMOKE_URL=https://sounding-preview-umair-rathore.vercel.app npm run test:auth:http
```

This uses the signed-in Vercel CLI for platform access and does not disable deployment protection. Application-level unauthenticated requests still omit Sounding session cookies.

Detailed evidence: [authentication verification](docs/AUTH-VERIFICATION.md), [original release verification](docs/VERIFICATION.md), [demo walkthrough](docs/DEMO.md).

## Architecture

Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4/CSS, Lucide, TanStack Virtual and Zod. Inter for the meeting workspace, locally bundled Sora for authentication reference fidelity. Better Auth 1.7.12 and pg provide real server-side sessions and PostgreSQL access.

- src/lib/auth-config.ts: maintained library configuration, password policy, verification/reset hooks, Google provider, cookies, sessions and rate limits.
- src/lib/workspace-store.ts: transactionally initialized workspace rows, user/session ownership joins, state validation and optimistic revision checks.
- src/components/workspace-provider.tsx: account-scoped client state, serialized persistence and explicit failure feedback.
- src/app/api/meetings/:id: authenticated owner-only reads/writes.
- src/lib/sharing.ts: authenticated encryption and expiry for read-only snapshots.
- migrations/: generated core auth schema and versioned application tables.

Authorization is checked in server layouts/pages and each private API. Database queries also require a matching, unexpired session. Private data is scoped by user; demo data by visitor session. No unidentified historical localStorage data is imported into private accounts.

## Recording journey and clips (local assessment additions)

Open http://localhost:3002/capture after choosing Try the public demo. Connect the sample calendar, admit the stub notetaker, replay either scenario, highlight a moment, finish processing, and open its insights. The replay supports 1×/30×/120×; pause and highlight actions save checkpoints. The explicit skip action uses the complete fixture.

On a meeting, create a clip from the playhead or an annotation, set its title/start/end, preview audio, and save. Share clip creates a 24-hour read-only viewer with selected transcript utterances and standalone extracted WAV audio when available. Whole-meeting sharing remains available. Download action items exports current owners, completion states and timestamps. Transcript tools include speaker filters, m:ss jumps and previous/next search matches.

These features are included in the development preview release; the original production deployment remains unchanged. Calendar, notetaker, recording lifecycle and insight extraction are explicitly simulated. The hour-long fixture remains transcript-only. See [the verified assessment matrix and evidence](docs/ASSESSMENT-GAP-AUDIT.md).

Run `npx tsx scripts/journey-smoke.ts` against the local app on port 3002 for clip/journey HTTP checks. It uses isolated demo sessions, keeps cookies/share URLs in memory and signs out its sessions afterward.

## Module 1: real recording processing

[Upload Recording](http://localhost:3002/upload) adds private MP4/WebM/MP3/M4A/WAV uploads (five minutes, 24 MB), grounded OpenAI transcription, strict gpt-4o-mini insights, durable Neon jobs and authorized playback. Public demo visitors cannot upload private recordings or consume AI credits. Existing synthetic meetings remain available.

One authorized 4:27.833 MP4 completed the genuine browser upload → transcription → analysis → persistent meeting → original playback journey: 56 segments, four evidence-linked actions, one highlight. Exactly two billable requests ran. Final token-based estimated cost: US$0.0781; conservative ledger reservations: US$0.40 of the US$1 authorization. Further paid processing is disabled pending new authorization.

See [Module 1 architecture, cost reconciliation, evidence and limitations](docs/REAL-AI-PROCESSING.md). Credentials, recordings, QA account data and private output stay outside Git in ignored configuration and private storage.

## Fixtures and limitations

Atlas launch review has four scripted speakers, eight transcript turns and self-generated Microsoft Zira speech. Timing comes from the actual PCM media boundaries. The participant tiles are illustrative, not video or real diarization. The eight-speaker planning meeting has 240 synthetic segments across 60 minutes. Two additional transcript-only fixtures demonstrate design and customer discussions.

Synthetic-meeting summaries and Ask are deterministic seeded behavior. Uploaded recordings use the cached real AI analysis; Ask remains a labeled keyword lookup. Guidance notes persist but are not interpreted by a model. English/Auto retains English source text. No live conferencing bot, real calendar/CRM integration, billing, invitations are connected. The calendar/notetaker journey is a labeled stub; clip creation and fixture-audio export work locally.

Shares are snapshots, not invitations. Previously created links remain usable until their 24-hour expiry even if future sharing is restricted. Keep the same SHARE_SECRET when maintaining an existing deployment's links. Existing production environment variables and deployment were not changed.

## Research and capture integrity

Original product research is under recon/. Authentication adds17 actual browser screenshots and six structured documents in recon/auth/. Fathom screenshots are ignored by Git, including crops that exclude account information. Public implementation screenshots contain only fictional Sounding content or non-sensitive preview infrastructure details.

The project capture hooks remain unchanged. Automatic agent logs were not manually reconstructed, inserted or edited; only automatically generated changes are versioned after review. The current assistant response can only be captured when its Stop hook runs.

## Deployment

Free Vercel Hobby; dedicated Neon Free Plan preview. CLI deployments are explicit; GitHub auto-deploy is not connected. Authentication is not promoted to production until provider configuration and complete login verification are finished. Preview environment secrets are configured independently of Production. No paid resources or plan upgrades were used.

Google preview callback: `https://sounding-preview-umair-rathore.vercel.app/api/auth/callback/google`. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Preview only, then test the actual provider flow. Live reset emails remain disabled until delivery verification passes.
