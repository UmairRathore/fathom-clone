# Authentication verification evidence

## Stage 1: reference evidence

17 actual Fathom screenshots were captured and reviewed before application implementation. They are under recon/auth/screenshots/ and ignored by Git. Six structured research documents record screen inventory, screenshot mapping, verified transitions, design measurements, validation/error behavior and the Sounding implementation map. No account identifiers, passwords, OTPs, recovery URLs or OAuth query strings were saved in screenshots. Some screenshots are explicitly cropped; the account-menu crop clips left text and excludes its account footer.

Observed: landing-to-signup; signup/login switching; Google/Microsoft entry; Google returning-account success to /home; logout twice; unauthenticated /home redirect; SSO empty/malformed validation; provider empty-identifier validation; mobile login/signup/SSO. Unverified: first-time onboarding, actual provider MFA, consent denial, recovery completion, server-timed expiration and SSO tenant lookup. No unnecessary Fathom account or security lockout was created.

## Stage 2: implementation and comparison

The Sounding login/signup use measured Sora typography, black canvas, dark 24px-radius card, cyan links and the same 288×56px provider-button size. At390×844, heading 30px, button 288×56px, document scroll width 385px: no horizontal overflow. Card top~154px versus reference~157px. Intentional differences: independent Sounding brand and educational copy, no copied endorsements, email/password and isolated public-demo additions, no fake Microsoft/SSO buttons. Extra configuration/isolation copy increases card height. Google button is disabled while unconfigured.

Implementation screenshots are in docs/screenshots/auth/ at matching 1142×1532 and 390×844 sizes. Desktop signup initially showed an incomplete browser paint after client navigation; a reload confirmed full stable rendering before saving. Native required-input feedback was observed on mobile. Reset-email-disabled and account/logout states were captured without any real account identifiers.

## Automated and hosted checks

- 20 tests pass: original 8 domain/media/sharing regressions plus authentication suite and 11 nested authentication cases.
- Authentication cases cover repeatable migrations, verified signup, password hashing, HttpOnly/SameSite/Secure cookies, invalid credentials, private persistence, mismatched owner/session rejection, stale revisions, invalid data, separate demo visitor sessions, logout cascade, server session expiry, CSRF, reset delivery into a test mailbox, one-use and expired tokens, reset session revocation, generic unknown-address response, constrained return URLs and database rate limits.
- 17 hosted PostgreSQL checks pass against the dedicated Neon sounding-preview database, including actual private signup/verification/login, profile update, owner isolation, persisted edits and logout revocation. Temporary test accounts are removed by exact IDs scoped to that run.
- 23 production HTTP checks pass locally against the Neon-backed production build, including one-click and credential demo login, protected redirects, owner API access, persisted changes, demo isolation, mutation blocking, CSRF, stale revision handling, no-store reads, cookie-free shared snapshot and logout.
- Typecheck, lint and production build pass. Final formatting and deployment validation are recorded below when complete.
- Google OAuth has not been exercised end-to-end because its client credentials are not configured. Live email delivery has not been tested or enabled; reset/signup verification uses a test-only in-memory mailbox.

Meaningful fixes during verification: protected layouts explicitly use dynamic rendering to avoid build-time auth initialization; PostgreSQL session joins prevent owner/session mismatch; test rate-limit state is isolated between cases; local socket connection uses a full PostgreSQL URI; CJS-compatible Next environment import; Neon TLS uses verify-full. No historical capture log was manually repaired or reconstructed.

## Infrastructure

Neon Console confirmed Free Plan, $0/month. Created a separate sounding-preview project and sounding-preview database in AWS US East 1; existing projects untouched. New project's default branch is named production by Neon, but it belongs only to this preview project. No existing production database is used. Project ID lucky-river-20564484; branch br-aged-moon-b8yg65h4. Schema and seed migrations applied and re-applied successfully.

The connection string was transferred from rendered Neon UI directly into ignored .env.local, without printing its value. The snippet wrapped visually; validation rejected incomplete reads before the complete wrapped string was saved. Clipboard cleared and password hidden afterward. No credential screenshot was saved.

Vercel Preview configuration uses the same isolated database and newly generated auth/demo keys. Production environment and alias are unchanged. Preview-only deployment; no promotion to the current production URL.

## Deployed preview verification

- Preview alias: https://sounding-preview-umair-rathore.vercel.app.
- Initial deployment HSR8CtdAfLK1XTbbEF9CKN6tgk3G built successfully in Vercel iad1 on Hobby. Production was not promoted or modified.
- All 22 deployed application HTTP checks passed using the authorized Vercel CLI, with Sounding cookies omitted for unauthenticated and read-only snapshot cases. A cookie-free request from the general public is stopped by Vercel Deployment Protection before it reaches the app; protection was not disabled.
- Deployed browser checks passed for one-click demo entry, real audio playback (106.10771 seconds), database-backed checkbox persistence after reload, account menu, and sign-out.
- Free Plan infrastructure proof and implementation screenshots are reviewed under docs/screenshots/auth/. Reference captures remain ignored.
- Google OAuth credentials and real sender delivery verification remain outstanding configuration steps. These features are visibly disabled, and no authentication change is deployed to the original production URL.

## Capture format and implementation screenshot manifest

The browser returns JPEG bytes. Current authentication images use .jpg extensions matching their actual format; no pixels were retouched or reconstructed. The requested mobile full-page reference capture returned a390×844 viewport image, so screenshot14 is explicitly named full-page-request and is not claimed to prove content below the viewport. Desktop auth pages fit the1532px viewport. CSS mobile viewports were390×844 in both products; the browser's returned JPEG dimensions sometimes exclude/scale scrollbars (390×843 or385×832). Comparisons use measured CSS coordinates, with this capture limitation disclosed.

| Implementation image         | State                                                   | CSS viewport |
| ---------------------------- | ------------------------------------------------------- | ------------ |
| 01-signin-desktop.jpg        | Local provider selection                                | 1142×1532    |
| 02-signup-desktop.jpg        | Local signup, providers unconfigured                    | 1142×1532    |
| 03-signin-mobile.jpg         | Neon-backed local login                                 | 390×844      |
| 04-email-required-mobile.jpg | Required email/password validation; both empty          | 390×844      |
| 05-reset-disabled-mobile.jpg | Reset disabled before sender configuration              | 390×844      |
| 06-account-mobile.jpg        | Isolated public-demo account; no personal identifier    | 390×844      |
| 07-deployed-account-menu.jpg | Vercel preview, persisted checkbox and account controls | 1142×1532    |
| 08-deployed-signed-out.jpg   | Vercel preview after Sign Out                           | 1142×1532    |
| 09-final-preview-desktop.jpg | Final deployed login, fresh browser tab                 | 1142×1532    |
| 10-final-preview-mobile.jpg  | Final deployed login                                    | 390×844      |
| neon-preview-free-plan.jpg   | Non-sensitive project/region/Free Plan crop             | Crop         |

Final deployment2DyHuXFzY7SJnqPhE9AeDiBcNZDR is Ready and the preview alias points to it. Seven final-release checks passed: plain login redirect, demo login, Secure/HttpOnly cookie, authenticated account, logout, revoked-session rejection and original public production HTTP200. Alias inspection confirms production still points to the original deployment. The preview browser reported zero console warnings/errors. Dependency audit reported zero known production vulnerabilities.

Candidate-file review includes the automatic agent logs: all checked text decodes as valid UTF-8 and contains no configured secret values. Fathom captures, environment files and local databases remain ignored. This is a targeted review, not a claim about future provider configuration.
