# Sounding authentication preview

This branch adds real authentication and PostgreSQL persistence without replacing the original production deployment at https://fathom-clone-three.vercel.app.

## Run locally

Use Node.js 24 and `npm ci`. Existing `.env.local` contains the dedicated Neon preview connection and generated keys; never print or commit it. The setup helper preserves existing values:

```sh
node scripts/setup-auth-env.mjs
npm run db:migrate
npm run build
npm start -- --port 3002
```

Local origin is http://localhost:3002. To run without hosted credentials, `npm run dev:auth` starts a loopback-only PGlite PostgreSQL engine and Next.js on port 3002. It stores generated local keys in ignored `.env.auth.local` and database files in ignored `.local-postgres/`. This is a local development option, not a serverless database fallback. Stop the other port 3002 server first.

`npm run db:migrate` uses Better Auth 1.7.12's schema migration API, followed by versioned transactional application migrations. The generated core schema is recorded in migrations/001-better-auth.sql. Application migrations are tracked in sounding_migration and serialized by an advisory transaction lock. Applying the current migrations twice is tested. No migration runs during a web request or deployment build.

## Authentication and authorization

Better Auth 1.7.12 handles credential hashing, Google OAuth, verification/reset tokens, database sessions and signed cookies. Password minimum 12 and maximum 128 characters. Cookies are HttpOnly, SameSite=Lax and Secure on HTTPS. Sessions have a hard 24-hour lifetime, no cookie-data authorization cache, and are revoked by logout. A client timer and page-visibility recheck return expired sessions to login, while server checks remain authoritative.

The Next.js route handler permits same-origin mutations only. Login, signup and reset requests have persisted database rate limits. One-click demo creation also has a database-backed global quota of 40 sign-ins per minute. Authorization checks occur in protected layouts/pages and every private API. PostgreSQL reads and writes join the current, unexpired session to the workspace owner. Client-supplied owner IDs are never trusted; unexpected request properties are rejected.

Private workspaces use a user-scoped key and persist across login sessions. Every account initially receives the same four fictional sample meetings in its own rows. Demo workspaces use a session-scoped key. The shared demo user can authenticate with its configured email/password or through a server-side one-click login; each sign-in creates independent visitor records. The demo password is kept server-side, not published in screenshots or Git. Demo profile/credential mutation endpoints are blocked. Signing out deletes that session and cascades to its visitor workspace, while other visitors remain unaffected. Private user workspaces survive logout.

The meeting editor uses optimistic UI with serialized writes, revision checks and an explicit saving indicator. Failed writes restore confirmed state and require a reload before further edits. There is no cross-account browser-local persistence or automatic import of unidentified historical localStorage data.

Public share links remain encrypted, read-only, immutable 24-hour snapshots. Creating one requires an authorized owner session; reading one requires no login. Previously issued snapshots remain valid until expiry. The existing production share key was not changed.

## Routes

| Route                | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| /users/sign_in       | Provider selection and isolated one-click demo          |
| /users/sign_in/email | Email/password login                                    |
| /users/sign_up       | Google signup and, when enabled, verified email signup  |
| /forgot-password     | Password recovery for credential accounts               |
| /reset-password      | New-password form for an expiring one-use token         |
| /account             | Protected account details, private profile name, logout |
| /home, /calls/:id    | Protected meetings                                      |
| /api/auth/*          | Better Auth endpoints with application guardrails       |
| /api/demo            | One-click server-side credential sign-in                |
| /api/meetings/:id    | Owner-scoped state reads and revisioned writes          |
| /share/:token        | Cookie-free read-only snapshot                          |

## Google OAuth configuration

Prepared but not enabled or claimed as end-to-end verified. Create a Google OAuth Web application with identity scopes only: openid, email, profile. No calendar, microphone, meeting or contact permissions are requested.

Exact preview authorized JavaScript origin:

`https://sounding-preview-umair-rathore.vercel.app`

Exact preview redirect URI:

`https://sounding-preview-umair-rathore.vercel.app/api/auth/callback/google`

Local redirect URI:

`http://localhost:3002/api/auth/callback/google`

Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in ignored local configuration or Vercel's Preview environment. BETTER_AUTH_URL must exactly equal the origin being tested; do not add broad wildcard trust. Account linking is disabled to prevent implicit email-based account takeover. Google is visibly disabled until both credentials are configured. After configuration, verify new and returning Google users, cancellation, redirects and logout before any production promotion.

## Reset email and signup delivery

Live delivery is deliberately disabled. Both AUTH_EMAIL_ENABLED and AUTH_EMAIL_DELIVERY_VERIFIED must be true, with a configured RESEND_API_KEY and AUTH_EMAIL_FROM. All four are required. Without them, reset/verification/email-signup APIs fail closed and the UI explains the unavailable state. The library's reset and verification flows are fully tested with an in-memory test mailbox, not a real inbox or logged links.

Before enabling: configure an authorized sender, verify real delivery to the dedicated test account, then enable the flags in Preview only. Reset requests use a generic response for nonexistent accounts; tokens expire after 15 minutes, cannot be reused and revoke existing sessions when consumed. Email-verification links expire after 1 hour. Google accounts recover through Google.

Never log mail URLs, token values, passwords, request bodies, cookies or database connection strings. Better Auth logging and Next.js incoming-request/browser forwarding logs are disabled. Hosting access-log retention/redaction must also be reviewed before enabling real OAuth/email callback traffic.

## Environment variables

See .env.example for empty placeholders. Required: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, DEMO_EMAIL, DEMO_PASSWORD, SHARE_SECRET. Optional provider configuration: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_EMAIL_ENABLED, AUTH_EMAIL_DELIVERY_VERIFIED, RESEND_API_KEY, AUTH_EMAIL_FROM. Generate high-entropy secrets directly into ignored environment files; never paste them in prompts or terminal commands.

## Verification and maintenance

```sh
npm test
npm run test:neon
npm run test:auth:http
npm run typecheck
npm run lint
npm run format:check
npm run build
```

The hosted verifier only accepts the dedicated sounding-preview Neon database, creates uniquely named test accounts and removes only the accounts created by that run. Test mail stays in process memory. HTTP smoke tests create disposable isolated demo sessions and sign them out.

`npm run db:cleanup` removes expired sessions, verification records and old demo quota counters; expired-session removal cascades to demo data. Private user data is preserved. Run as explicit maintenance; no paid scheduler is provisioned.

Sources: [Better Auth installation](https://better-auth.com/docs/installation), [Next.js integration](https://better-auth.com/docs/integrations/next), [PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql), [email/password](https://better-auth.com/docs/authentication/email-password), [session management](https://better-auth.com/docs/concepts/session-management). Implementation uses the pinned installed library, not beta-only APIs.
