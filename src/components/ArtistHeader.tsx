import Link from "next/link";
import Record from "@/components/Record";
import { resolveRecordStyle } from "@/lib/record-styles";
import { isHttpsUrl, linkHost, withClaimedFirstTag } from "@/lib/safe-url";
import HelpTip from "@/components/HelpTip";

export type ArtistView = {
  name: string; slug: string; verified_at: string | null; next_claim_number: number; record_style?: string | null;
};

export default function ArtistHeader({ artist, sourceUrl }: { artist: ArtistView; sourceUrl: string | null }) {
  const claimers = artist.next_claim_number - 1;
  return (
    <header className="artist-head">
      <Record style={resolveRecordStyle(artist.record_style, artist.slug)} size={120} />
      <div>
        <h1>{artist.name}</h1>
        <p>
          <span className="badge">{artist.verified_at ? "Artist-verified" : "Fan-created page, not verified by the artist"}</span>
          {artist.verified_at ? <HelpTip id="verified-artist" /> : <HelpTip id="fan-created-page" />}
        </p>
        {!artist.verified_at && (
          <p className="verify-prompt">Are you this artist? <Link href={`/artist/${artist.slug}/manage`}>Verify this page</Link> to take it over.</p>
        )}
        {sourceUrl && (
          <p>
            {isHttpsUrl(sourceUrl)
              ? <><a href={withClaimedFirstTag(sourceUrl)} target="_blank" rel="noopener noreferrer">Source link</a> <span className="link-host">({linkHost(sourceUrl)})</span></>
              : <>Source: {sourceUrl}</>}
          </p>
        )}
        <p className="stat-line">
          {claimers} {claimers === 1 ? "Scout has" : "Scouts have"} claimed this Artist. Be #{artist.next_claim_number}.<HelpTip id="claim-number" />
        </p>
      </div>
    </header>
  );
}
