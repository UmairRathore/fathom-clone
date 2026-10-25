# Gmail SMTP setup — pending account-owner authorization

> **Historical milestone report.** The complete application was publicly released from `98d7a46` on 2026-10-25. Earlier preview-only, deployment, authentication and test-count statements below describe that milestone. Use the [current README](../README.md) and [assessment guide](ASSESSMENT-GUIDE.md) for present behavior; the original report body is retained as evidence.

The optional Nodemailer adapter uses the existing Better Auth verification/reset callbacks and Neon records. Gmail is selected with `AUTH_EMAIL_PROVIDER=gmail`; legacy Resend configuration remains compatible. SMTP is fixed to `smtp.gmail.com`, port 465, implicit TLS, certificate validation and TLS 1.2 or newer. Protocol logging is disabled, timeouts are bounded, and provider errors are replaced with generic messages. Email text contains the existing Better Auth link; it is never logged.

Google account inspection confirmed that two-step verification was off. The owner completed Google's password challenge, but Google still showed **Turn on 2-Step Verification**. Gmail app passwords require two-step verification; the normal Google account password is not a supported substitute. No app password has been created, collected or transferred.

The owner must complete two-step enrollment. App-password creation and sensitive credential entry remain owner-controlled. After Google offers App passwords, create a dedicated **Sounding SMTP** credential and put it directly into `SMTP_PASS` in the project's ignored `.env.local`; do not send it through chat, screenshots or tool output. The other local Gmail values are prepared, and both `AUTH_EMAIL_ENABLED` and `AUTH_EMAIL_DELIVERY_VERIFIED` remain false. No credential belongs in public commits or client variables.

Do not set either email gate true merely because an SMTP connection authenticates or accepts a message. First verify actual inbox receipt for the authorized test account. Then test real signup, delivered verification, login, delivered reset and post-reset login with isolated test data. Copy server-only configuration to the existing Vercel **preview** environment through a secret-safe stdin transfer, never process arguments or printed values. Keep public production unchanged.

Current verification: 61 tests, TypeScript, lint and production build pass. Three new mail tests cover readiness gates, TLS configuration, single-recipient messages, transport cleanup, disabled protocol logging, recipient/header validation and sanitized failures. These use mocked SMTP; no genuine delivery, signup activation or password-reset delivery is claimed. No Vercel deployment has changed for this preparation.

References: [Google app-password requirement](https://support.google.com/mail/answer/185833?hl=en), [Nodemailer SMTP](https://nodemailer.com/smtp), [Nodemailer Gmail guide](https://nodemailer.com/guides/using-gmail).
