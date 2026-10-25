import { redirect } from "next/navigation";
import { currentSession } from "@/lib/workspace";
import { safeReturnPath } from "@/lib/http-security";
import { OnboardingFlow, type OnboardingStep } from "./onboarding-flow";
export async function OnboardingPage({
  step,
  searchParams,
}: {
  step: OnboardingStep;
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await currentSession();
  if (!session) redirect("/users/sign_in");
  return (
    <OnboardingFlow
      key={step}
      step={step}
      name={session.user.name}
      destination={safeReturnPath((await searchParams).next)}
    />
  );
}
