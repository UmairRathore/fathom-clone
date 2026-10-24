import { AuthPage } from "@/components/auth-page";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page(props: { searchParams: Promise<{ token?: string; error?: string }> }) {
  return <AuthPage mode="reset" {...props} />;
}
