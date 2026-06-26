"use client";

import { useState, useTransition } from "react";
import { submitServiceRequest } from "@/app/need/actions";
import { LocationCapture } from "@/components/LocationCapture";
import { ServiceRequestSuccess } from "@/components/ServiceRequestSuccess";
import { hasCompleteLocation, type UserLocation } from "@/lib/location";
import { URGENCY_OPTIONS, type ServiceUrgency } from "@/lib/serviceRequest";

export type ServiceRequestResult = {
  id: string;
  callPhone: string;
  areaDisplay: string;
  serviceName: string;
  urgency: string;
};

export function ServiceRequestForm({
  serviceName: initialServiceName,
  slug,
  intentCampaignId,
  headline,
  subline,
  serviceEditable = false,
  compact = false,
}: {
  serviceName: string;
  slug?: string;
  intentCampaignId?: string;
  headline?: string;
  subline?: string;
  serviceEditable?: boolean;
  compact?: boolean;
}) {
  const [serviceName, setServiceName] = useState(initialServiceName);
  const [urgency, setUrgency] = useState<ServiceUrgency>("now");
  const [details, setDetails] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ServiceRequestResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (success) {
    return <ServiceRequestSuccess result={success} />;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!location || !hasCompleteLocation(location)) {
      setError("Select your country, region, and town/area.");
      return;
    }

    startTransition(async () => {
      const result = await submitServiceRequest({
        serviceName,
        slug,
        intentCampaignId,
        urgency,
        details,
        contactPhone,
        contactName,
        location,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if ("id" in result && result.id) {
        setSuccess(result as ServiceRequestResult);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`card border-brand-400/30 bg-gradient-to-b from-brand-500/10 to-transparent ${compact ? "p-5" : "p-6 sm:p-8"}`}
    >
      <div>
        <span className="chip border border-brand-400/30 bg-brand-500/15 text-brand-200">Urgent help</span>
        <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">
          {headline ?? "Tell us what you need — we'll connect you"}
        </h2>
        {subline && <p className="mt-2 text-sm text-slate-400">{subline}</p>}
      </div>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-300">What do you need?</span>
          <input
            type="text"
            required
            minLength={3}
            value={serviceName}
            readOnly={!serviceEditable}
            onChange={(e) => setServiceName(e.target.value)}
            className={`mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 ${!serviceEditable ? "opacity-90" : ""}`}
            placeholder="e.g. Flat tire repair"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-slate-300">How urgent is this?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {URGENCY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${
                  urgency === opt.value
                    ? "border-brand-400/50 bg-brand-500/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="urgency"
                  value={opt.value}
                  checked={urgency === opt.value}
                  onChange={() => setUrgency(opt.value)}
                  className="sr-only"
                />
                <span aria-hidden>{opt.emoji}</span>
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <LocationCapture embedded compact onLocationChange={setLocation} />

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Anything else we should know? (optional)</span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Stuck on the motorway, need mobile fitter…"
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Your phone number</span>
            <input
              type="tel"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+44 7… or local number"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Your name (optional)</span>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="First name"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500"
            />
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-6 w-full py-4 text-base disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Get connected now"}
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        After you submit, we&apos;ll show a number to call a local provider in your area.
      </p>

      {error && <p className="mt-3 text-sm text-signal-distress">{error}</p>}
    </form>
  );
}
