# Reference to implementation map

Stage 1 finished before application edits: 17 actual screenshots were inspected and routes/interactions documented. Unavailable states remain explicitly unverified.

| Reference | Sounding implementation | Intentional difference |
| --- | --- | --- |
| Login 02/13 | /users/sign_in | Google, email/password and one-click demo; no fake Microsoft/SSO |
| Signup 03/15 | /users/sign_up | Private accounts; verified email delivery required for email signup |
| SSO fields 04–06/16 | /users/sign_in/email, /forgot-password, /reset-password | Sounding-only credential/recovery forms styled using reference hierarchy |
| Google 09–11 | OAuth redirect | Never recreate Google's credential page |
| Home 12/menu 01 | Protected /home, /calls/:id, /account | Actual server sessions and owner-scoped PostgreSQL data |
| Logout 02 | POST signout | Revocation and expiry |
| No public demo observed | One-click and configured credential demo | Separate server workspace per visitor session |
| No Fathom reset observed | Sounding password reset | Disabled until email provider is configured and tested |
| Existing Sounding shares | /share/:token | Public read-only expiry retained |

Better Auth 1.7.12, Next.js handler and PostgreSQL implement actual authentication. Every protected page/API validates the server session; cookie presence alone is insufficient. Database owner/session joins reject mismatches. Private workspaces persist by user; demo workspaces are scoped to sign-in sessions. Old localStorage data is not imported across accounts. Deployment is Preview only; existing production is untouched.

Google client credentials and tested email transport remain external configuration prerequisites. See docs/AUTHENTICATION.md for exact redirect URIs and environment variables, and docs/AUTH-VERIFICATION.md for completed tests.
