import { OnboardingPage } from "@/components/onboarding-page";
export const dynamic = "force-dynamic";
export default function Page(props: { searchParams: Promise<{ next?: string }> }) {
  return <OnboardingPage step="preferences" {...props} />;
}
