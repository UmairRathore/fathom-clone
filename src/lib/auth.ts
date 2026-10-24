import { createAuthentication, type AuthMail } from "./auth-config";
import { getPool } from "./db";
export function emailReady() {
  return (
    process.env.AUTH_EMAIL_ENABLED === "true" &&
    process.env.AUTH_EMAIL_DELIVERY_VERIFIED === "true" &&
    !!process.env.RESEND_API_KEY &&
    !!process.env.AUTH_EMAIL_FROM
  );
}
async function sendMail(mail: AuthMail) {
  // URLs and credentials never enter logs. Enable only after sender delivery verification.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      text: `${mail.subject}\n\nOpen this link to continue:\n${mail.url}\n\nIf you did not request this, ignore this email.`,
    }),
  });
  if (!response.ok) throw new Error("Email delivery failed.");
}
let auth: ReturnType<typeof createAuthentication> | undefined;
export function getAuth() {
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32 ||
    !process.env.BETTER_AUTH_URL
  )
    throw new Error("Preview authentication is not configured.");
  return (auth ??= createAuthentication({
    pool: getPool(),
    secret: process.env.BETTER_AUTH_SECRET,
    origin: process.env.BETTER_AUTH_URL,
    sendMail: emailReady() ? sendMail : undefined,
    google:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
        : undefined,
  }));
}
export function isDemoEmail(email: string) {
  return email.toLowerCase() === (process.env.DEMO_EMAIL ?? "demo@sounding.example").toLowerCase();
}
