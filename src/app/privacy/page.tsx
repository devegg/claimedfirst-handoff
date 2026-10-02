import Link from "next/link";

export const metadata = { title: "Privacy" };

const DRAFT_NOTICE = "Draft: pending legal review. This page is not a published policy.";

export default function PrivacyPage() {
  return (
    <main className="narrow prose">
      <p role="note" className="notice"><strong>{DRAFT_NOTICE}</strong></p>
      <h1>Privacy</h1>
      <p>This is a plain-language description of what ClaimedFirst stores and who can see it.</p>

      <h2>What we store</h2>
      <ul>
        <li>Your email address, used to sign you in.</li>
        <li>Your handle, which is public.</li>
        <li>Your claims, with their numbers and dates, including claims you later dropped.</li>
        <li>Your watchlist, which the public never sees.</li>
        <li>Your referral link and who joined through it.</li>
        <li>Verification attempts you make for an artist page, including the page address checked.</li>
        <li>Reports you send about a page, with your reason.</li>
      </ul>
      <p>You stay signed in through a session cookie. The site has no advertising or analytics code in it.</p>

      <h2>Who sees your name</h2>
      <p>Your handle, claim numbers and dates are shown the way you choose for each claim: with your name, to the artist only, or anonymous. For each watch, the artist sees your name only if you chose that. The public never sees your watchlist. You can change these choices from your roster or settings. See the <Link href="/guide">Guide</Link>.</p>

      <h2>Your data</h2>
      <p>ClaimedFirst does not sell your data. When you verify an artist page, the server loads the page you picked to look for your code. Sign-in emails are sent through an email provider.</p>

      <h2>Asking for a page to be removed</h2>
      <p>If a page is yours, verify it and then remove it from the manage page. If it is not yours, or it should not be here, use the Report this page button on the page.</p>

      <h2>Changes</h2>
      <p>This page is a draft and will change once it has been reviewed.</p>
    </main>
  );
}
