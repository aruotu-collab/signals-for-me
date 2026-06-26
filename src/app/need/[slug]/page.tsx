import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntentPageView } from "@/components/IntentPageView";
import { getPublishedCampaign, getRelatedCampaigns } from "@/lib/intent/queries";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getPublishedCampaign(slug);
  if (!campaign) return { title: "Not found" };
  return {
    title: campaign.metaTitle,
    description: campaign.metaDescription,
    openGraph: {
      title: campaign.metaTitle,
      description: campaign.metaDescription,
      url: `${SITE_URL}/need/${campaign.slug}`,
    },
  };
}

export default async function NeedIntentPage({ params }: Props) {
  const { slug } = await params;
  const campaign = await getPublishedCampaign(slug);
  if (!campaign) notFound();

  const related = await getRelatedCampaigns(campaign);

  return <IntentPageView campaign={campaign} related={related} />;
}
