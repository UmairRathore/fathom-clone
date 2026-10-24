import nodemailer from "nodemailer";
import type { AuthMail } from "./auth-config";

type Environment = Record<string, string | undefined>;
export function mailConfiguration(env: Environment = process.env) {
  if (env.AUTH_EMAIL_PROVIDER === "gmail") {
    const user = env.SMTP_USER?.trim().toLowerCase();
    const pass = env.SMTP_PASS?.replace(/\s/g, "");
    const from = env.AUTH_EMAIL_FROM?.trim().toLowerCase();
    if (
      !user ||
      !/^[a-z0-9._%+-]+@gmail\.com$/.test(user) ||
      from !== user ||
      !pass ||
      !/^[a-zA-Z0-9]{16}$/.test(pass)
    )
      return null;
    return { provider: "gmail" as const, user, pass, from };
  }
  if (env.AUTH_EMAIL_PROVIDER && env.AUTH_EMAIL_PROVIDER !== "resend") return null;
  if (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM) return null;
  return { provider: "resend" as const, key: env.RESEND_API_KEY, from: env.AUTH_EMAIL_FROM };
}
export function emailDeliveryReady(env: Environment = process.env) {
  return (
    env.AUTH_EMAIL_ENABLED === "true" &&
    env.AUTH_EMAIL_DELIVERY_VERIFIED === "true" &&
    !!mailConfiguration(env)
  );
}
export function gmailTransportOptions(config: { user: string; pass: string }) {
  return {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: config.user, pass: config.pass },
    tls: { minVersion: "TLSv1.2" as const, servername: "smtp.gmail.com", rejectUnauthorized: true },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    logger: false as const,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
type DeliveryTransport = {
  sendMail: (message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    disableFileAccess: boolean;
    disableUrlAccess: boolean;
  }) => Promise<{ accepted: unknown[]; rejected: unknown[] }>;
  close: () => void;
};
export async function sendAuthMail(
  mail: AuthMail,
  env: Environment = process.env,
  makeTransport: (
    options: ReturnType<typeof gmailTransportOptions>,
  ) => DeliveryTransport = nodemailer.createTransport,
) {
  const config = mailConfiguration(env);
  if (!config) throw new Error("Email delivery is not configured.");
  // Single recipient, fixed sender and no attachments, external resources or SMTP protocol logs.
  if (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(mail.to) || /[\r\n]/.test(mail.subject))
    throw new Error("Invalid email request.");
  const text = `${mail.subject}\n\nOpen this link to continue:\n${mail.url}\n\nIf you did not request this, ignore this email.`;
  try {
    if (config.provider === "gmail") {
      const transport = makeTransport(gmailTransportOptions(config));
      try {
        const result = await transport.sendMail({
          from: config.from,
          to: mail.to,
          subject: mail.subject,
          text,
          disableFileAccess: true,
          disableUrlAccess: true,
        });
        if (!result.accepted.length || result.rejected.length) throw new Error();
      } finally {
        transport.close();
      }
    } else {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: config.from, to: [mail.to], subject: mail.subject, text }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
    }
  } catch {
    // Provider errors can contain private addresses, credentials or verification links.
    throw new Error("Email delivery failed. Please try again later.");
  }
}
