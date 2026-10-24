import { AuthScreen, type AuthMode } from "./auth-screen";
import { currentSession } from "@/lib/workspace";
import { redirect } from "next/navigation";
export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: AuthMode;
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const query = await searchParams;
  if (
    (mode === "login" || mode === "signup") &&
    process.env.DATABASE_URL &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL
  )
    if (await currentSession()) redirect("/home");
  return <AuthScreen mode={mode} next={query.next} reason={query.reason} />;
}
