import { createAuthentication } from "./auth-config";
import { emailDeliveryReady, sendAuthMail } from "./auth-mail";
import { getPool } from "./db";
export const emailReady = emailDeliveryReady;
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
    sendMail: emailReady() ? sendAuthMail : undefined,
    google:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
        : undefined,
  }));
}
export function isDemoEmail(email: string) {
  return email.toLowerCase() === (process.env.DEMO_EMAIL ?? "demo@sounding.example").toLowerCase();
}
