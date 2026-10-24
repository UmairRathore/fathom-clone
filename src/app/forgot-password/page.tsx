import { AuthPage } from "@/components/auth-page";
export const dynamic = "force-dynamic";
export default function Page(props: { searchParams: Promise<{ next?: string }> }) {
  return <AuthPage mode="forgot" {...props} />;
}
