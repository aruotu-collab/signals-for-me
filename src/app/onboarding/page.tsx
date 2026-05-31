import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { groupedTaxonomy } from "@/lib/taxonomy";
import { OnboardingForm } from "./OnboardingForm";
import { saveOnboarding } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/onboarding");

  const groups = groupedTaxonomy();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-6">
        <div className="text-xs uppercase tracking-wide text-slate-500">Welcome</div>
        <h1 className="mt-1 text-3xl font-bold text-white">What should we watch for you?</h1>
        <p className="mt-2 text-slate-400">
          Pick the signals you care about. We&apos;ll build your personalized feed and daily digest
          around them. You can change these anytime.
        </p>
      </div>

      <OnboardingForm
        action={saveOnboarding}
        groups={groups}
        defaultAudience={user.audience === "consumer" ? "consumer" : "business"}
      />
    </div>
  );
}
