# Sounding — Your meetings, remembered

A Fathom-inspired product engineering assessment: review recordings alongside transcripts, find decisions, track actions, highlight moments and share focused clips. Sounding is independent of Fathom. Public sample meetings and participants are fictional.

**[Open the live application](https://fathom-clone-three.vercel.app)** · **[Evaluator guide](docs/ASSESSMENT-GUIDE.md)** · **[Submission and capture audit](docs/SUBMISSION-AUDIT.md)**

The complete application, including disposable authentication, is publicly deployed on Vercel Hobby. No Vercel login is required at the production URL. Development previews remain protected. The verified application revision is [`98d7a46`](https://github.com/UmairRathore/fathom-clone/commit/98d7a46ce5544a582f5c2d6c7c80e2e4a5cc3470); subsequent documentation commits do not change the deployed application.

## Product capabilities and boundaries

| Capability             | Implemented behavior                                                                                                     | Deliberate boundary                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Accounts               | Name-only registration, creation-only generated credentials, login/logout, persistent private workspace, profile editing | Fixed 24-hour lifetime; no email verification, password recovery or OAuth                       |
| Public demo            | Immediate entry without credentials; isolated visitor changes                                                            | Fictional seed content; logout/reentry starts a fresh visitor workspace                         |
| Library and transcript | Cross-meeting search, filters, timestamp seeking, active transcript tracking, readable groups, copy/download             | Recognized speaker labels are not verified identities                                           |
| Playback               | Real audio playback and seeking; owner-authorized private recordings                                                     | Launch fixture uses synthesized speech; transcript-only fixtures have no playback               |
| Insights               | Summary templates, evidence-linked actions, highlights and annotations                                                   | Fixture summaries are deterministic; Ask is seeded/keyword lookup, not a general AI assistant   |
| Capture journey        | Calendar/notetaker/admission simulation, pause/resume, live highlights, processing-to-insights flow                      | No real calendar permissions, conferencing bot or microphone recording                          |
| Clips                  | Fractional ranges, preview, saved clips, standalone WAV excerpts, anonymous expiring/revocable links                     | Audio-only export, maximum 120 seconds; transcript-only clips have no audio                     |
| Long meetings          | Virtualized 60-minute, eight-speaker, 240-segment fixture; responsive independently scrolling panels                     | A synthetic transcript usability test, not an hour-long recording or transcription benchmark    |
| Real AI processing     | Private upload, transcription, structured analysis, stored results and synchronized original playback                    | Explicitly approved recordings and server budget gates only; not open-ended public API spending |

The launch review contains 106.1 seconds of locally synthesized speech, four scripted participants and eight transcript turns. The hour-long planning meeting and two other meetings are transcript-only. Illustrative participant tiles are not video. Private real recordings are accessible only to their owners and are not evaluator fixtures.

## Try it

Choose **Try Public Demo** on the [sign-in page](https://fathom-clone-three.vercel.app/users/sign_in), or create a name-only account. Save its generated login ID and password privately before leaving the welcome screen. The login ID remains in your profile; the password is shown only at creation and cannot be recovered. Account access ends exactly 24 hours after creation, including after a new login.

Follow the [assessment guide](docs/ASSESSMENT-GUIDE.md) for onboarding, clips, recording simulation and a five-minute walkthrough. Unavailable provider, paid and team integrations are visibly disabled.

## Architecture

A modular Next.js 16 App Router application with React 19, strict TypeScript, Tailwind 4/CSS, Lucide icons, TanStack Virtual and Zod. Better Auth handles credential hashing and server-side sessions. PostgreSQL access uses `pg` and versioned SQL migrations, hosted on Neon. Recordings and derived clips use private Vercel Blob storage; server-side FFmpeg prepares audio. OpenAI transcription and structured analysis run only through guarded server code.

- `src/app/`: pages, server authorization and HTTP handlers.
- `src/lib/auth-config.ts`, `src/lib/temporary-accounts.ts`: authentication, temporary identities and absolute expiry.
- `src/lib/workspace-store.ts`: scoped persistence and revision conflict checks.
- `src/lib/recordings/`: private media, processing, budget controls and clip preparation.
- `src/components/workspace-provider.tsx`: account/session-scoped client state and save feedback.
- `migrations/`: core authentication schema and application migrations through 007.
- `scripts/`, `tests/`: maintenance, fixture tests and HTTP/security checks.

Production and the protected preview currently use the same verified Neon database and private Blob store. This is an assessment deployment, not separate production/staging data infrastructure. Ownership and session checks isolate workspaces within that store. Use a separate local database for development and destructive tests.

## Recording upload and AI limits

[Upload Recording](https://fathom-clone-three.vercel.app/upload) requires a private account. Accepted formats are MP4/WebM with audio and MP3/M4A/WAV, up to **five minutes and 24 MB**. Demo visitors cannot upload private recordings or consume AI credits. There is no general server-side video transcoding or live meeting capture.

An OpenAI key alone does not authorize processing. Server feature flags, an approved recording ID, database budget reservations and idempotency controls gate billable work. Arbitrary evaluator uploads are not automatically approved for paid processing. The fictional demo needs no external AI calls.

One authorized 267.833-second recording previously completed real upload → transcription → analysis → persisted meeting → playback. Its 56 saved segments demonstrate persistence coverage, not independently established recognition accuracy. Single-voice diarization and technical-word accuracy remain limitations; no word-error-rate improvement is claimed. Private media, transcripts and bearer links are withheld from public Git. See [processing evidence](docs/REAL-AI-PROCESSING.md) and [recognition audit](docs/RECOGNITION-ACCURACY-AUDIT.md).

## Security and retention

Private pages and APIs enforce authenticated ownership; demo mutations are scoped to the visitor session. Passwords are salted scrypt hashes. Production session cookies use Secure, HttpOnly and SameSite attributes. Logout revokes the server session. CSRF, credential rate limits, registration quotas, redirect validation and expired-session rejection have regression coverage.

Sharing is explicit. New clip links are opaque, revocable and expire within 24 hours, capped by account expiry. Changing/deleting a clip invalidates its link. Guests receive the selected excerpt and contained transcript utterances, not the complete private source. Whole-meeting sharing is limited to fictional fixtures. Already downloaded/buffered bytes cannot be recalled. Do not publish generated credentials or live share links in an assessment recording or repository.

The separate `sounding-preview-cleanup` project retains its secret-protected daily `17 0 * * *` job (00:17 UTC nominally). It targets the same database/storage, with a minimum 15-minute grace period and durable retries. Hobby scheduling and service failures can delay physical deletion; access expiry is enforced independently at the fixed deadline. See [authentication and cleanup design](docs/DISPOSABLE-AUTHENTICATION.md).

## Local development

Use **Node.js 24.x** and the pinned lockfile:

```sh
npm ci
npm run dev:auth
```

Open [localhost:3002](http://localhost:3002). This starts persistent local PGlite PostgreSQL and the application, creates ignored development credentials, and runs migrations/seeding against the local database. It requires no hosted database credentials. Do not copy production secrets into a local checkout. Optional cloud upload/AI functionality requires separate server configuration; the seeded demo works without it.

For your own isolated PostgreSQL database, create an ignored `.env.local` using the variable names below, then:

```sh
node scripts/setup-auth-env.mjs
npm run db:migrate
npm run dev -- --port 3002
```

The setup helper preserves existing values and generates missing local authentication secrets. Migration/seeding writes to `DATABASE_URL`; confirm it is your development database before running. Set `BETTER_AUTH_URL` to the exact local origin.

To run a built application with the same local database helper:

```sh
npm run build
npm run dev:auth -- --production
```

For an independently configured PostgreSQL environment, use `npm start -- --port 3002` after building.

### Server-only environment variables

Never commit real values. `.env.local`, generated local credentials, media and deployment state are ignored. Hosted values belong in private Vercel environment configuration.

| Variable                                            | Purpose                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                      | PostgreSQL connection; isolated development database locally                                      |
| `BETTER_AUTH_SECRET`                                | High-entropy session/authentication secret                                                        |
| `BETTER_AUTH_URL`                                   | Exact application origin; public production uses the live URL above                               |
| `DEMO_EMAIL`, `DEMO_PASSWORD`                       | Server-side demo seed identity/credential; visitors use the demo button                           |
| `SHARE_SECRET`                                      | Share capability protection; preserve across releases to retain valid links                       |
| `BLOB_READ_WRITE_TOKEN`                             | Private recording/derived media store; required for cloud uploads                                 |
| `CLIP_SHARE_ORIGIN`                                 | Public clip-only viewer origin; production uses `https://sounding-clips-umair-rathore.vercel.app` |
| `OPENAI_API_KEY`                                    | Server API key; never a `NEXT_PUBLIC_` variable                                                   |
| `TRANSCRIPTION_MODEL`                               | Approved model configuration, currently `gpt-4o-transcribe-diarize`                               |
| `TRANSCRIPTION_LANGUAGE`                            | Optional supported language hint                                                                  |
| `AI_PROCESSING_ENABLED`, `AI_APPROVED_RECORDING_ID` | Explicit processing gate and recording allowlist; keep disabled for ordinary local/evaluator use  |
| `TEMPORARY_CLEANUP_SECRET`                          | Local operator configuration for the separate cleanup deployment                                  |

The cleanup-only project uses private `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` and `CRON_SECRET`. It is not the main app. Database budget authorization is additional to environment configuration. OAuth/SMTP/Resend credentials are not required or used by the current disposable-account flow; historical email flags do not enable it.

## Tests and verified release

```sh
npm test
npm run typecheck
npm run lint
npm run build
python3 -m unittest discover -s tests -p test_capture.py -v
node scripts/check-staged.mjs
```

With the local app running, the current HTTP suites can also be run against isolated local test data:

```sh
npx tsx scripts/temporary-auth-smoke.ts
npm run test:recordings:http
npx tsx scripts/journey-smoke.ts
npx tsx scripts/capture-smoke.ts
```

Some operator suites require private configured test fixtures; do not run cleanup, real-clip or database maintenance scripts against shared production data casually. Protected-preview HTTP checks use `AUTH_SMOKE_VERCEL=true` and `SMOKE_URL` with an authorized Vercel CLI; this retains platform protection. Earlier email-auth/demo-only scripts document earlier milestones and are not the current account walkthrough.

Release evidence for application commit **98d7a46**, verified 2026-10-25:

- **70/70 automated tests**, TypeScript, ESLint and production build passed.
- **148 production HTTP/operator checks** passed: disposable authentication 22, recording security 34, journey 19, capture 16 and clip security 57.
- Anonymous browser checks passed for public entry, registration page, demo entry, playback/seeking and mobile stacking. The preceding release-candidate browser audit covered generated-credential login and onboarding.
- Public login/registration were accessible without Vercel authentication; private routes/APIs rejected anonymous requests; development preview remained protected.
- Configured-secret scans passed for checked Git blobs, client assets and capture files. These are scoped checks, not an exhaustive historical-secret or penetration-test guarantee.

The earlier [release-candidate report](docs/RELEASE-CANDIDATE-AUDIT.md) records 205 preview checks and its then-current deployment state. It is historical evidence, not the current deployment guide. No new paid AI call or deployment is needed for this documentation update.

## Research and submission integrity

Product reconnaissance is under [recon/](recon/PRODUCT-RECONNAISSANCE.md). Private Fathom screenshots, recordings and transcripts are excluded from Git. [CAPTURE-TEST.md](CAPTURE-TEST.md) preserves successful canaries and the initial failures. [Capture documentation](docs/AGENT-CAPTURE.md) explains append-only records, genuine turn identifiers and interruption limits.

**Public capture submission is incomplete.** The active local session contains unpublished private material; its older public prefix is not the complete development history. No historical log was reconstructed, sanitized or rewritten in this documentation update. See the [exact inventory, format deviations and recommendation](docs/SUBMISSION-AUDIT.md). Separate private submission is not authorized by the supplied assessment rules and needs written agreement from 8x.
