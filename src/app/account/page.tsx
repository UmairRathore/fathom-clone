import { AccountPanel } from "@/components/account-panel";
import { emailReady } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default function Account() {
  return <AccountPanel emailEnabled={emailReady()} />;
}
