import Link from "next/link";
import HelpTip from "@/components/HelpTip";
import { isHttpsUrl, linkHost } from "@/lib/safe-url";

export type ArtistStatusRow = {
  name: string; slug: string; status: string; source_url: string | null;
  verified: boolean | null; support_points: number | null; needed: number | null;
};

/** What a visitor sees at the address of a page that is not live (from public_artist_status). */
export default function NonLiveArtist({ row }: { row: ArtistStatusRow }) {
  if (row.status === "pending") {
    const needed = row.needed ?? 3;
    const have = Math.min(row.support_points ?? 0, needed);
    const host = isHttpsUrl(row.source_url) ? linkHost(row.source_url) : null;
    const prefill = new URLSearchParams({ name: row.name.slice(0, 80) });
    if (isHttpsUrl(row.source_url)) prefill.set("url", row.source_url);
    return (
      <main className="narrow">
        <div className="page-head">
          <p className="eyebrow">Needs scouts</p>
          <h1>{row.name}</h1>
        </div>
        <section className="panel" aria-label="Page progress">
          <p className="scout-progress"><strong>{have} of {needed} scouts</strong> <HelpTip id="pending-page" /></p>
          <p>This page goes live once {needed} scouts have added it. A verified artist counts as 2.</p>
          {host && isHttpsUrl(row.source_url) && (
            <p>
              Source: <a href={row.source_url} target="_blank" rel="nofollow ugc noopener noreferrer">{host}</a>
              <span className="link-host"> (opens {host} in a new tab)</span>
            </p>
          )}
          <p><Link className="btn btn-primary" href={`/submit?${prefill.toString()}`}>Add my support</Link></p>
        </section>
        <section className="claim-actions">
          <button type="button" className="btn" disabled aria-describedby="claim-reason">Claim</button>
          <p id="claim-reason" className="disabled-reason">This page needs {needed} scouts before claims open.</p>
        </section>
      </main>
    );
  }
  if (row.status === "disputed") {
    return (
      <main className="narrow">
        <h1>{row.name}</h1>
        <p role="note" className="state-note">This page is under review. New claims are paused.</p>
      </main>
    );
  }
  if (row.status === "delisted") {
    return (
      <main className="narrow">
        <h1>{row.name}</h1>
        <p role="note" className="state-note">The artist removed this page.</p>
      </main>
    );
  }
  return (
    <main className="narrow">
      <h1>{row.name}</h1>
      <p>This page is not live yet.</p>
    </main>
  );
}
