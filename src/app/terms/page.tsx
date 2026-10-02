import Link from "next/link";

export const metadata = { title: "Terms" };

const DRAFT_NOTICE = "Draft: pending legal review. This page is not a published policy.";

export default function TermsPage() {
  return (
    <main className="narrow prose">
      <p role="note" className="notice"><strong>{DRAFT_NOTICE}</strong></p>
      <h1>Terms</h1>
      <p>ClaimedFirst is a place to back music artists early and keep a record of when you did. These are plain-language terms for how that works.</p>

      <h2>Recognition only</h2>
      <p>Claim numbers, points and boards are recognition. There are no prizes, no payouts and no rewards of money or goods.</p>
      <p>Claims and accounts cannot be sold, traded or transferred, and nobody may pay for a claim.</p>

      <h2>Not an investment</h2>
      <p>A claim is an expression of support for an artist. It is not an investment, a share, a contract or a right to anything an artist earns. ClaimedFirst does not handle money, and nothing here can be bought, sold or traded.</p>

      <h2>Links out only</h2>
      <p>Artist pages link to the artist&apos;s own pages elsewhere. Music, images and text from other sites are not copied here. Anything an artist writes on their own page here, such as song titles and links, is theirs.</p>

      <h2>Who sees your name</h2>
      <p>For each claim you choose to show your name, show it to the artist only, or stay anonymous. For each watch you choose whether the artist sees your name. The public never sees your watchlist. Your claim number stays the same whichever you choose. The <Link href="/guide">Guide</Link> explains each level.</p>

      <h2>Pages made by fans</h2>
      <p>Anyone signed in can add an artist page. Until the artist verifies it, the page is marked as fan-created. An artist verifies a page by placing a one-time code on one of their own public pages.</p>

      <h2>Asking for a page to be removed</h2>
      <p>If a page is yours, verify it and then remove it from the manage page. If it is not yours, or it should not be here, use the Report this page button on the page.</p>

      <h2>Changes</h2>
      <p>These terms are a draft and will change once they have been reviewed.</p>
    </main>
  );
}
