import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { claimShareText, formatClaimDate, SITE_URL } from "@/lib/share";

type Props = { params: Promise<{ artistSlug: string; number: string }> };

// Reads only through public_claim: never claims or profiles. Unknown, pending or non-live all return null.
async function load(slug: string, numberText: string) {
  if (!/^[a-z0-9-]{1,100}$/.test(slug) || !/^[1-9][0-9]{0,8}$/.test(numberText)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_claim", { p_slug: slug, p_number: Number(numberText) });
  const row = (data as { handle: string; claim_number: number; artist_name: string; status: string; claimed_on: string | null }[] | null)?.[0];
  return row ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artistSlug, number } = await params;
  const row = await load(artistSlug, number);
  if (!row) return {};
  const { title, description } = claimShareText(row.handle, row.artist_name, row.claim_number);
  const images = [{ url: "/og-default.png", width: 1200, height: 630, alt: "ClaimedFirst" }];
  return {
    metadataBase: new URL(SITE_URL),
    title, description,
    robots: { index: false, follow: false },
    openGraph: { title, description, images },
    twitter: { card: "summary_large_image", title, description, images: ["/og-default.png"] },
  };
}

export default async function ClaimLinkPage({ params }: Props) {
  const { artistSlug, number } = await params;
  const row = await load(artistSlug, number);
  if (!row) notFound();
  return (
    <main className="narrow friend-view">
      <h1>{row.handle} was #{row.claim_number} on {row.artist_name}.</h1>
      <p className="claim-facts">
        {formatClaimDate(row.claimed_on) && <>Claimed {formatClaimDate(row.claimed_on)}. </>}
        <span className="badge" data-testid="claim-status">{row.status === "active" ? "Active" : "Historical"}</span>
      </p>
      <p className="big-num">Be #{row.claim_number + 1}.</p>
      <p><Link className="btn" href={`/artist/${artistSlug}`}>Claim {row.artist_name}</Link></p>
    </main>
  );
}
