# Locked product surfaces — UI polish

This release adds presentation and limited local interaction around Sounding's existing core product. It does not add backend integrations, billing, team collaboration, CRM synchronization, playlists, support delivery, API keys or account deletion.

## Reference review

Before implementation, the signed-in Fathom product was inspected in the authorized browser: `/customize`, Team Calls (team onboarding upsell), `/playlists`, Deals, Help & Feedback and the profile dropdown. Visual references informed the dense settings cards, yellow benefit lists, cyan CTAs, overlapping product illustrations, muted deal table, white support panel and compact dropdown. No trial, integration, account change, support ticket or message was submitted to Fathom.

Fathom's Refer and points controls did not open an observable panel during this inspection. Those two Sounding previews follow the user's written structure and the product's existing visual language; pixel-exact parity is not claimed. No new product screenshots accompanied this brief beyond the earlier authentication references.

Product illustrations are native HTML/CSS with fictional names and data. They never display an actual user's saved meeting content.

## Built surfaces

| Surface         | Route / entry          | Behavior                                                                                                                                                                                                      |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Team Calls      | `/team-calls`          | Premium hero, benefits and fictional team/analytics illustration. CTA opens upgrade preview; actual trial activation disabled.                                                                                |
| Playlists       | `/playlists`           | Premium hero with collection preview and benefits. No playlist storage or collaboration.                                                                                                                      |
| Deals           | `/deals`               | Fictional table and filters behind a dismissible paywall dialog. Upgrade is preview-only.                                                                                                                     |
| Refer           | Header Refer           | Example reserved-domain link, functional example-link Copy, disabled social/partner controls. No invitations or rewards.                                                                                      |
| Settings        | `/settings`            | Eight complete visual sections, jump navigation and inactive mutation controls. No preferences or provider state written.                                                                                     |
| Help & Feedback | Header Help & Feedback | White support dialog; local responses, Help center tab and expandable FAQs. Explicitly states no ticket/message is sent.                                                                                      |
| Points          | Header gold badge      | Hover/focus/click popover with ten demo points and clear inactive rewards disclaimer.                                                                                                                         |
| Profile         | Header avatar          | Test-call simulation, tutorial, FAQs, developer preview, account/privacy links, terms/security/status previews, download preview, project/about and working logout. Current login identifier shown at bottom. |

Settings includes Zoom/Meet/Teams cards, premium features, all eight requested integrations, API/MCP, privacy/share options, desktop/extension/Zoom apps, four highlight categories and a disabled destructive section. Connection statuses are accurate: not connected / manual capture, instead of falsely claiming real integrations are enabled. Checked switches in premium rows are explicitly illustrative and do not enable processing. Existing meeting-specific controls continue to function.

The reusable existing modal gained an optional styling class, preserving its focus trap, Escape dismissal, backdrop dismissal and focus restoration. New dialogs render outside the sticky header so their overlay is not confined to its stacking context. Popovers dismiss on outside click/Escape. Protected layouts reuse the same existing workspace/session guard as My Calls.

## Verification

- TypeScript, ESLint and production build pass.
- All 69 existing automated regressions pass, covering authentication, expiry/cleanup, isolation, transcription, insights, clips, sharing and simulated capture.
- 49 new local HTTP checks pass for route protection, navigation, previews, all settings sections/integrations, disabled controls, core meeting access and revoked-session denial.
- Existing local HTTP suites pass: 28 authentication, 19 clip/journey, 16 capture and 34 private-recording security checks. Processing used cached results; no paid API calls.
- Browser checks pass: trial CTA opens a non-billing dialog; keyboard focus stays inside dialogs; Escape dismisses; referral Copy changes to Copied; support ticket action reports no message sent; FAQ expands; points/profile open and dismiss; settings has zero active mutation controls.
- Desktop visual comparison performed at 1440 px. Narrow checks performed at 390 px, including scrollable Deals modal and accessible header actions. Final deployed screenshots and release identifiers are appended below.
- Authentication/backend libraries, migrations, cleanup scheduler, source private media and logging hooks remain unchanged. The private current automatic log is excluded from commits.

Run `npx tsx scripts/locked-surfaces-smoke.ts` for local checks. Set `SMOKE_URL` and `AUTH_SMOKE_VERCEL=true` for the protected preview. The existing journey smoke script now accepts `SMOKE_URL` so its unchanged assertions can target the current test server.

## Deployed release evidence

- Implementation commit: a5b878c, pushed to codex/authentication-preview.
- Protected preview: https://sounding-preview-umair-rathore.vercel.app . Immutable deployment: fathom-clone-bvm72uqbb-umair-rathore.vercel.app (HcQ53BsimwSK3DtiQF8acmGpN1y6). Vercel Authentication remains enabled.
- All 49 locked-surface HTTP checks pass on the deployed preview. Seven final-release checks also pass, including Secure/HttpOnly session cookies, demo entry, logout revocation and unchanged public production availability.
- Deployed browser global search still returns sample meetings and opens the correct meeting detail with recording media present. Browser profile logout was verified locally. No real provider, referral, ticket, trial, purchase or deletion was triggered.
- Screenshot files: team-calls.png, playlists.png, deals.png, refer-modal.png, settings-connections.png, settings-premium.png, settings-integrations.png, settings-api-options.png, settings-apps-highlights-delete.png, settings-full.png, help-feedback.png, points-popover.png, profile-dropdown.png, mobile-settings.png and mobile-deals.png. The completion report links the local screenshot gallery; these are not runtime assets.
- All four new routes pass the 390 px no-horizontal-overflow check. Support and account panels fit that viewport. Mobile Deals scrolls inside its dialog. Temporary viewport overrides were reset.
- Final private-output and configured-secret scans pass. Historical log prefix and all 22 appended capture frames validate; logging hooks and other historical logs are unchanged. The current private log is excluded from commits.
- Original public production deployment A6s6ZwNCC2QE622thEYELCSaYY37 is unchanged. The public clip viewer and cleanup-only project were not redeployed.
- Additional paid API spending: USD 0. No billing or paid resource was enabled.
