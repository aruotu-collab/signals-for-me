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

  // Pre-load the user's current interests so this page doubles as a
  // "manage interests" screen for returning users.
  const isEditing = user.subscriptions.length > 0;
  const initialSelected = Array.from(
    new Set(user.subscriptions.map((s) => s.signalType).filter((t): t is string => Boolean(t))),
  );
  const initialKeyword = user.subscriptions.find((s) => s.keyword)?.keyword ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-6">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {isEditing ? "Your interests" : "Welcome"}
        </div>
        <h1 className="mt-1 text-3xl font-bold text-white">
          {isEditing ? "Refine your signals" : "What should we watch for you?"}
        </h1>
        <p className="mt-2 text-slate-400">
          {isEditing
            ? "Update what we track for you. Your feed and daily digest adjust to match."
            : "Pick the signals you care about. We'll build your personalized feed and daily digest around them. You can change these anytime."}
        </p>
      </div>

      <OnboardingForm
        action={saveOnboarding}
        groups={groups}
        defaultAudience={user.audience === "consumer" ? "consumer" : "business"}
        initialSelected={initialSelected}
        initialKeyword={initialKeyword}
        isEditing={isEditing}
      />
    </div>
  );
}
