# Registration / onboarding UI polish

This release changes presentation and guided navigation only. Better Auth credentials, temporary-account creation, exact 24-hour expiry, password hashing, isolated workspaces, recovery limitations and the separate cleanup cron are unchanged. No migration, provider authorization, desktop application or paid API call is added.

Disposable signup still asks only for a name and immediately signs in the visitor. The one-time password remains only on the initial welcome screen; **Continue to setup** clears those credentials before navigating into onboarding. Existing login-ID and public-demo entry remain usable. The sign-in page adds three explicitly disabled provider buttons without changing credential login behavior.

| Reference image | Route                                   | Verified behavior                                                                             |
| --------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| Screen 1        | `/users/sign_in`                        | Google, Microsoft and SSO disabled; credential login, Create account and public demo retained |
| Screen 2        | `/users/sign_up/confirm-personal-email` | Two personal/team cards; personal continues; work/team action disabled                        |
| Screen 3        | `/onboarding/customize/auto_record`     | Manual capture / Only me selectors disabled; unchecked consent disables Continue              |
| Screen 4        | `/onboarding/customize/auto_record`     | Checked consent enables Continue; unchecking disables it again                                |
| Screen 5        | `/signup/questionnaire/personal/role`   | Seven roles; one selection advances to Zoom; selection is local UI state                      |
| Screen 6        | `/onboarding/connect/zoom`              | Connect disabled; Skip advances to install screen                                             |
| Screen 7        | `/zoomless/onboarding/download`         | Two static cards with disabled download/notification controls; Skip returns to workspace      |

The dynamic `[id]` role route is retained; `personal` is a neutral route identifier, not a user ID or credential. All setup routes require the existing authenticated session. Valid workspace return destinations are carried through setup; external destinations fall back to `/home`. The original route names mentioning email and Zoom are preserved for visual parity, but no email is collected and no connection is attempted.

The design uses the supplied references: dark backgrounds, centered header, cyan progress bars, large two-card compositions, outlined cyan controls, a warm gradient introduction and responsive layouts. Sounding branding and accurate demo/unavailable text replace unsupported provider claims. Disabled controls retain their palette with reduced opacity and no active hover state. The consent checkbox is UI guidance; it is not a substitute for the consent and upload controls already enforced in the meeting workflows. Role selection does not change actual product permissions or persist a backend preference.

## Verification

- 69 automated regression tests pass, including authentication, temporary expiry/cleanup, workspace isolation and Modules 1–3.
- 23 local HTTP checks pass: disabled providers, authenticated setup routes, anonymous redirects, disabled initial controls, final Skip and safe return destination handling. Run `npx tsx scripts/onboarding-smoke.ts`; set `SMOKE_URL` and `AUTH_SMOKE_VERCEL=true` for the protected preview.
- Local real-browser checks pass: personal selection → preferences; disabled manual/private selectors; consent false → true → false → true; role selection → Zoom; Zoom Skip → install; final Skip → `/home`.
- TypeScript, lint and production build pass. Private-output scanning passes. No backend files, existing migrations, logging hooks or cleanup configuration are changed.
- Protected-preview browser checks also pass for a newly created disposable fixture account: name-only signup, masked one-time welcome, Continue to setup, all guided steps, final Skip into the private workspace and setup Sign out. No generated credential was captured in screenshots or logs.

## Release evidence

- UI implementation commit: 3702205, pushed to codex/authentication-preview.
- Protected preview: https://sounding-preview-umair-rathore.vercel.app . Immutable deployment: fathom-clone-9od5v831p-umair-rathore.vercel.app (CWqhQhgjNkvuxQAZQaf6GzdYr5it). Vercel Authentication remains on.
- All 23 onboarding HTTP checks also pass against the deployed preview.
- Screenshots captured in supplied order: screen-1-sign-in.png, screen-2-personal-team.png, screen-3-preferences-unchecked.png, screen-4-preferences-checked.png, screen-5-role.png, screen-6-zoom.png, screen-7-desktop.png. Additional credential-free mobile-preferences.png and lower-login-controls evidence were saved locally. Screenshot gallery is supplied with the completion report; images are not required runtime assets.
- Desktop two-card layout verified at 1440 px; all five setup routes checked at 390 px with no horizontal overflow. Temporary browser viewport overrides were reset.
- Configured-secret scan passes for five automatic logs, 457 reachable Git blobs and 41 client assets. Historical log prefix and capture-frame digests remain intact; the current private log is excluded from commits.
- Original public production deployment A6s6ZwNCC2QE622thEYELCSaYY37 is unchanged. The existing clip viewer and cleanup project were not redeployed. No API spending or backend integration was added.
