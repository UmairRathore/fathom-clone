# Disposable authentication release

> **Historical milestone report.** The complete application was publicly released from `98d7a46` on 2026-10-25. Earlier preview-only, deployment, authentication and test-count statements below describe that milestone. Use the [current README](../README.md) and [assessment guide](ASSESSMENT-GUIDE.md) for present behavior; the original report body is retained as evidence.

Sounding reuses Better Auth, Neon and the existing private-workspace model. Public account creation asks only for a name. It creates a synthetic `demo-<random>@sounding.local` login ID, a cryptographically random 192-bit password, an isolated workspace and an authenticated session. This identifier is not a mailbox. Its internal `emailVerified` flag does not claim real email verification.

The initial welcome screen holds credentials only in React memory. Users can reveal/copy the password or explicitly download a private credentials file. Continuing, navigating away or reloading clears that screen. Only Better Auth's salted scrypt hash is persisted. Profile pages retain the login ID and exact account deadline, never a retrievable password. Losing credentials requires a new account. Browser clipboard/downloads are user-controlled copies and must be kept private.

## Absolute expiry

Migration 007 adds separate temporary-account metadata without changing permanent accounts or historical migrations. Database time sets an immutable 24-hour lifetime. A database session trigger and Better Auth session hook cap new sessions to that deadline. Guarded session reads and workspace/recording queries independently reject expired accounts. Relogin does not extend their lifetime. Expired session rows may remain until cleanup but are unusable immediately.

New share grants, legacy snapshots and signed media/upload capabilities cannot outlive a temporary account. Revoked or expired clip access is rejected. Previously downloaded or buffered content cannot be recalled. Existing permanent accounts and original public demo access remain supported.

## Cleanup and free scheduling

The separately approved **sounding-preview-cleanup** Vercel project contains only a secret-protected cleanup endpoint and robots exclusion. It uses the dedicated preview database and private blob store; it serves no application UI. Cron is enabled with schedule `17 0 * * *` (nominally 00:17 UTC / 05:17 Pakistan). Vercel Hobby execution can occur within that hour or be delayed. Access expiry never depends on cron execution. See [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Cleanup enqueues expired accounts after a minimum 15-minute grace period. A leased durable queue retains all original and derived object keys. Storage deletion must succeed before a transaction deletes credentials, sessions, workspace records, transcripts, summaries, highlights, recordings and shares through existing foreign-key cascades. Failures retain data and schedule retry eligibility after one hour; the daily invocation processes eligible retries. Permanent and unexpired accounts are explicitly protected even if misqueued. An object-key-only tombstone repeats deletion for 48 hours to cover late uploads, then is removed on a later successful run. Physical deletion can therefore be later than expiry, especially after service failures. Monitor the job's aggregate failed count; no private content is logged.

`node scripts/build-cleanup.mjs` creates the ignored deployment bundle. `node scripts/configure-cleanup.mjs` configures private environment variables without printing values and refuses unrelated projects. Deploy **only that generated cleanup directory** with `--prod`; the main app remains preview-only. The cleanup endpoint requires its private `CRON_SECRET`. The ignored local operator secret is `TEMPORARY_CLEANUP_SECRET`. Never put these values in commands or documentation.

## Abuse and recovery

Registration accepts a strict name-only payload, enforces same-origin requests and uses database quotas of 10 creations per hour and 20 across recent 24-hour buckets globally. These intentionally conservative free-resource limits can temporarily block all signup during abuse; public demo remains separate. Existing credential rate limits, CSRF checks and owner isolation remain active. Uploads retain the 24 MB / five-minute / three-attempt limits. Paid AI processing remains disabled by default and subject to existing separate approval and budget checks.

Public recovery pages state that recovery is unavailable; they do not send emails or generate reset tokens. Public email signup, verification, reset and social endpoints fail closed. Runtime Google/SMTP/Resend configuration, SMTP transport/dependency and email UI have been removed. Existing Better Auth schema and optional mail-callback configuration used by legacy security fixtures are retained; the runtime supplies no mail callback/provider. Older email/OAuth reports describe superseded proposals.

## Verification

- Automated suite: 69 passing tests, including temporary-account generation, hashing, isolation, absolute expiry, unchanged relogin deadline, invalid credentials, expired media/share access, permanent-account protection, durable cleanup failures/retries and successful cascades.
- Local HTTP: 22 disposable-auth checks, 28 authentication checks, 34 recording-security checks, 19 clip/journey checks and 16 simulated-capture checks passed. No paid transcription or analysis was requested.
- Real storage fixture: seven checks passed using newly created disposable test data and fictional 0.1-second audio. The deployed cleanup endpoint removed both the actual private original object and derived clip object plus fixture database rows. Unauthorized invocation was denied. Real existing private recordings were untouched.
- Local browser: name-only signup, immediate authenticated workspace, welcome Reveal/Hide controls, visible profile ID/deadline, refresh and logout were checked. Generated-password relogin was verified through real HTTP calls; browser automation redacts password reads, so that portion was not represented as a completed manual browser test. Credential download control is implemented but no plaintext credential file was downloaded during testing.
- TypeScript, ESLint and production build passed. Final release status and deployed checks are recorded below after deployment.

Tests that force expiry/deletion use isolated fixtures only. No real permanent account is selected for cleanup. Credentials are never printed by the smoke scripts. Automatic historical agent logs are not rewritten or included in this release commit.

## Deployed release evidence

- Implementation commit: 06ceaf9; credential-control layout follow-up: 1e833c7. Both are pushed to codex/authentication-preview.
- Protected application preview: https://sounding-preview-umair-rathore.vercel.app (immutable deployment fathom-clone-6nh2vmz2h-umair-rathore.vercel.app; ID 3ao76RtTLuWqPCjFVkaS9o6pdQC6). Vercel Authentication remains enabled.
- The deployed account API passed all 22 disposable-account HTTP checks. The final layout deployment passed seven release checks covering protected redirects, instant demo, Secure/HttpOnly cookies, account display, logout revocation and original public-demo availability.
- Deployed browser checks confirmed name-only creation, masked one-time welcome credentials, immediate private workspace, profile ID and precise deadline, persistent session after refresh, logout and public-demo entry. Browser generated-password return was not completed because credential reads are redacted; real HTTP return checks passed. Copy-password/download were not exercised end-to-end.
- Cleanup deployment: sounding-preview-cleanup-2a6gne2gk-umair-rathore.vercel.app (ID 2Wg487u8xD2G4EvhfubM4ERyg3CA). Project metadata confirms daily cron enabled. Secret authorization and manual invocation passed. The next scheduled invocation has not yet been observed; no wall-clock 24-hour wait was used. Expiry boundaries were tested with disposable fixtures.
- Production dependency audit: zero vulnerabilities. Configured-secret checks passed against five automatic logs, 445 reachable Git blobs and 40 client assets. This checks configured secrets, not every possible historical credential.
- Historical log prefix and all 16 appended capture-frame checksums remain valid UTF-8; four other historical logs and capture implementation are unchanged. The current private transcript log remains outside the release commits.
- The original public production deployment ID A6s6ZwNCC2QE622thEYELCSaYY37 is unchanged. Main remains 7cf99f9b686f76f77465ca4dbe2fff610b8cfc51. The existing public clip viewer was not deployed.
- Additional paid API expenditure: USD 0. No billing or paid resources were enabled.
