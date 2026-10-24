import { AuthPage } from "@/components/auth-page";
export const dynamic = "force-dynamic";
export default function Page(props: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  return <AuthPage mode="signup" {...props} />;
}
