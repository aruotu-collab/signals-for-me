import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuoteRequestByToken } from "@/lib/ebay/quotes";
import { QuoteTracker } from "../../ui/QuoteTracker";

export const dynamic = "force-dynamic";

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await getQuoteRequestByToken(token);
  if (!request) notFound();

  return (
    <div className="space-y-4">
      <Link href="/opportunities" className="text-sm text-slate-400 hover:text-white">
        ← Back to Opportunities
      </Link>
      <QuoteTracker request={request} />
    </div>
  );
}
