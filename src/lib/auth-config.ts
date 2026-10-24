import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { temporaryAccount } from "./temporary-accounts";
import type { Pool } from "pg";

export type AuthMail = { to: string; subject: string; url: string };
export function createAuthentication(options: {
  pool: Pool;
  secret: string;
  origin: string;
  sendMail?: (mail: AuthMail) => Promise<void>;
}) {
  return betterAuth({
    appName: "Sounding",
    baseURL: options.origin,
    secret: options.secret,
    database: options.pool,
    trustedOrigins: [options.origin],
    logger: { disabled: true },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.sendMail,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: 900,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: options.sendMail
        ? async ({ user, url }) => {
            const credential = await options.pool.query(
              'SELECT 1 FROM account WHERE "userId"=$1 AND "providerId"=$2 AND password IS NOT NULL',
              [user.id, "credential"],
            );
            if (credential.rowCount)
              await options.sendMail!({
                to: user.email,
                subject: "Reset your Sounding password",
                url,
              });
          }
        : undefined,
    },
    emailVerification: {
      sendOnSignUp: !!options.sendMail,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: options.sendMail
        ? async ({ user, url }) =>
            options.sendMail!({ to: user.email, subject: "Verify your Sounding email", url })
        : undefined,
    },
    socialProviders: {},
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const account = await temporaryAccount(options.pool, session.userId);
            if (account && !account.active)
              throw new APIError("UNAUTHORIZED", { message: "Invalid login ID or password." });
            return {
              data: {
                ...session,
                ...(account
                  ? {
                      expiresAt: new Date(
                        Math.min(
                          new Date(session.expiresAt).getTime(),
                          account.expires_at.getTime(),
                        ),
                      ),
                    }
                  : {}),
              },
            };
          },
        },
      },
    },
    account: { accountLinking: { enabled: false }, encryptOAuthTokens: true },
    session: {
      expiresIn: 60 * 60 * 24,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: new URL(options.origin).protocol === "https:",
      cookiePrefix: "sounding",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    user: { changeEmail: { enabled: false }, deleteUser: { enabled: false } },
  });
}
