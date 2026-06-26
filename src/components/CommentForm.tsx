"use client";

import { useState, useTransition } from "react";
import { addComment } from "@/app/ideas/actions";

export function CommentForm({ ideaId, signedIn }: { ideaId: string; signedIn: boolean }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      window.location.href = `/login?callbackUrl=/ideas/${ideaId}`;
      return;
    }
    if (!body.trim()) return;

    startTransition(async () => {
      const result = await addComment({ ideaId, body: body.trim() });
      if (result.error) setError(result.error);
      else {
        setBody("");
        setError("");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={signedIn ? "Share why you want this…" : "Sign in to comment"}
        rows={3}
        className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-slate-500"
      />
      {error && <p className="text-sm text-signal-distress">{error}</p>}
      <button type="submit" disabled={pending || !body.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
        {pending ? "Posting…" : "Post comment"}
      </button>
    </form>
  );
}
