import { AuthScreen, type AuthMode } from "./auth-screen";
import { emailReady } from "@/lib/auth";
import { currentSession } from "@/lib/workspace";
import { redirect } from "next/navigation";
export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: AuthMode;
  searchParams: Promise<{ next?: string; reason?: string; token?: string; error?: string }>;
}) {
  const query = await searchParams;
  // Login can replace an expired session; no account data is sent to an unauthenticated client.
  if (
    (mode === "login" || mode === "signup") &&
    process.env.DATABASE_URL &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL
  ) {
    if (await currentSession()) redirect("/home");
  }
  return (
    <AuthScreen
      mode={mode}
      google={!!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET}
      emailEnabled={emailReady()}
      next={query.next}
      reason={query.reason}
      validToken={!!query.token && !query.error}
    />
  );
}
