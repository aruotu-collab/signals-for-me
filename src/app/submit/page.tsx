"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitIdea } from "@/app/ideas/actions";
import { DEMAND_CATEGORIES } from "@/lib/demand";

export default function SubmitIdeaPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError("");

    startTransition(async () => {
      const result = await submitIdea(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.id) {
        router.push(`/ideas/${result.id}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <span className="chip border border-white/10 bg-white/5 text-slate-300">Unserved Demand</span>
      <h1 className="mt-3 text-3xl font-bold text-white">What do you wish existed?</h1>
      <p className="mt-2 text-slate-400">
        Submit an idea for a product or service you want. Other people can vote, and businesses can see the demand.
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 space-y-5 p-6">
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Idea title</span>
          <input
            name="title"
            required
            minLength={5}
            maxLength={120}
            placeholder="e.g. Mobile car wash at my home"
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Describe what you want</span>
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={2000}
            rows={5}
            placeholder="Describe the service, when you'd use it, and why it doesn't exist today…"
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Category</span>
          <select
            name="category"
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white"
          >
            {DEMAND_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Location (optional)</span>
          <input
            name="location"
            placeholder="e.g. London, Manchester, UK-wide"
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500"
          />
        </label>

        {error && <p className="text-sm text-signal-distress">{error}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full py-3 disabled:opacity-50">
          {pending ? "Submitting…" : "Submit idea"}
        </button>
      </form>
    </div>
  );
}
