import Link from "next/link";
import Record from "@/components/Record";
import { resolveRecordStyle } from "@/lib/record-styles";

export type DiscoverArtist = {
  name: string; slug: string; verified_at: string | null; next_claim_number: number; record_style?: string | null;
};

export default function ArtistCard({ artist }: { artist: DiscoverArtist }) {
  const claimed = artist.next_claim_number - 1;
  return (
    <li className="panel artist-card">
      <Record style={resolveRecordStyle(artist.record_style, artist.slug)} size={72} decorative />
      <div className="artist-card-body">
        <h3><Link href={`/artist/${artist.slug}`} title={artist.name}>{artist.name}</Link></h3>
        <p><span className="badge">{artist.verified_at ? "Verified" : "Fan-created page"}</span></p>
        {!artist.verified_at && <p className="card-note">Fans can claim this page before the artist verifies it.</p>}
        <p>{claimed === 0 ? "No claims yet." : `Claimed by ${claimed}.`} Be #{artist.next_claim_number}.</p>
      </div>
    </li>
  );
}
