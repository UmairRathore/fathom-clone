import { createAuthentication } from "./auth-config";
import { getPool } from "./db";
// Email and OAuth registration have been replaced by internal disposable credentials.
import { temporaryAccount } from "./temporary-accounts";
function runtimeAuthentication() {
  const core = createAuthentication({
    pool: getPool(),
    secret: process.env.BETTER_AUTH_SECRET!,
    origin: process.env.BETTER_AUTH_URL!,
  });
  return {
    ...core,
    api: {
      ...core.api,
      getSession: async (input: { headers: Headers }) => {
        const session = await core.api.getSession(input);
        if (session && (await temporaryAccount(getPool(), session.user.id))?.active === false)
          return null;
        return session;
      },
    },
  };
}
let auth: ReturnType<typeof runtimeAuthentication> | undefined;
export function getAuth() {
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32 ||
    !process.env.BETTER_AUTH_URL
  )
    throw new Error("Preview authentication is not configured.");
  return (auth ??= runtimeAuthentication());
}
export function isDemoEmail(email: string) {
  return email.toLowerCase() === (process.env.DEMO_EMAIL ?? "demo@sounding.example").toLowerCase();
}
