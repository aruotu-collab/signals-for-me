import { redirect } from "next/navigation";

export default async function LegacyQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/quotes/${token}`);
}
