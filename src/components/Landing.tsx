import Link from "next/link";

export default function Landing() {
  return (
    <main className="landing" id="top">
      <section className="lp-hero">
        <div className="lp-container lp-hero-inner">
          <div>
            <p className="eyebrow">For early listeners and artists</p>
            <h1>Find them first.<br /><em>Keep the number.</em></h1>
            <p className="lp-lede">Fans back independent AI music artists early and get a lasting claim number. Artists can make their page their own and see who showed up at the start.</p>
            <div className="lp-actions">
              <Link className="btn" href="/login">Create an account</Link>
              <a className="btn secondary" href="#artists">See what artists get</a>
            </div>
            <p className="lp-hero-note">Free to join. Recognition only—no prizes or payments.</p>
          </div>
          <div className="lp-hero-art" role="img" aria-label="Record illustration with example claim number seven">
            <div className="lp-record" />
            <div className="lp-ticket" aria-hidden="true"><small>Example claim</small><strong>#7</strong></div>
          </div>
        </div>
      </section>

      <section className="lp-section" id="artists">
        <div className="lp-container">
          <div className="lp-artist-intro">
            <div className="lp-section-head">
              <p className="eyebrow">For artists</p>
              <h2>Give your first listeners a place in your story.</h2>
              <p>Someone may already have made a page for you. Verify it to show it is yours, share the songs you want people to hear, and see the fans who backed you early.</p>
              <div className="lp-actions">
                <Link className="btn" href="/discover#search">Find your artist page</Link>
                <Link className="btn secondary" href="/login">Create an account</Link>
              </div>
            </div>
            <div className="lp-preview" role="group" aria-label="Illustration of an artist page after verification">
              <div className="lp-preview-top"><small>Your artist page</small><span className="lp-status">Verified artist</span></div>
              <h3>Your music, your page.</h3>
              <p>A simple home for the people who found you early.</p>
              <div className="lp-preview-row"><b>Top Songs</b><span>Up to 10 links</span></div>
              <div className="lp-preview-row"><b>Early supporters</b><span>Claim numbers</span></div>
              <div className="lp-preview-row"><b>Artist controls</b><span>Choose what appears</span></div>
              <p className="lp-caption">Illustrative page. No artist or listener data is shown.</p>
            </div>
          </div>
          <div className="lp-benefits">
            <div className="lp-benefit"><span className="lp-n">01</span><h3>See who was there early.</h3><p>Your private audience view shows claim numbers and totals. You see names only when fans choose to share them with you.</p></div>
            <div className="lp-benefit"><span className="lp-n">02</span><h3>Put your songs up front.</h3><p>Add up to ten links to songs you want people to hear. Change the links as your music changes.</p></div>
            <div className="lp-benefit"><span className="lp-n">03</span><h3>Make it yours.</h3><p>Choose a record style, add an optional support link, and manage or remove your verified page.</p></div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-steps" id="how">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="eyebrow">How artists get started</p>
            <h2>Three small steps. Your page is yours.</h2>
            <p>Verification confirms that you control a public artist profile. You do not need to upload music or artwork here.</p>
          </div>
          <div className="lp-steps-grid">
            <div className="lp-step"><span className="lp-n">01</span><h3>Find or add your page</h3><p>Search for your artist name. If there is no page yet, add a link to your public artist profile.</p></div>
            <div className="lp-step"><span className="lp-n">02</span><h3>Verify it is you</h3><p>Place a short code in the bio or description of a public profile you control. ClaimedFirst checks for the code.</p></div>
            <div className="lp-step"><span className="lp-n">03</span><h3>Welcome your people</h3><p>Pick a record style, add your song links, and see the early fans who chose to be visible to you.</p></div>
          </div>
          <div className="lp-actions lp-actions-after"><Link className="btn" href="/discover#search">Find your page</Link></div>
        </div>
      </section>

      <section className="lp-section" id="fans">
        <div className="lp-container lp-fan-grid">
          <div className="lp-claim-card" role="group" aria-label="Example claim card showing number seven">
            <small>Your early call</small>
            <strong>#7</strong>
            <p>An example of the number a fan might receive for one artist. Every artist has their own sequence.</p>
          </div>
          <div>
            <p className="eyebrow">For fans</p>
            <h2>Your taste has a timestamp.</h2>
            <p className="lp-lede">Find an artist you believe in. Back them and get a number that says when you arrived. Share it with a friend, or keep it to yourself.</p>
            <ul className="lp-fan-list">
              <li><b>Discover</b> independent AI music artists.</li>
              <li><b>Claim</b> one early and keep its number.</li>
              <li><b>Share</b> your claim card when you want to.</li>
            </ul>
            <div className="lp-actions"><Link className="btn" href="/discover">Discover artists</Link></div>
          </div>
        </div>
      </section>

      <section className="lp-meaning">
        <div className="lp-container lp-meaning-inner">
          <h2>A number means you were there.</h2>
          <p>If you are #7, you were the seventh person to claim that artist on ClaimedFirst. It is a keepsake and a way to recognize early support. It is not ownership of an artist or their music, and it has no cash value.</p>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-container lp-faq-grid">
          <div><p className="eyebrow">Good to know</p><h2>A few clear answers.</h2></div>
          <div>
            <details><summary>Can someone make a page for me?</summary><p>Yes. Fans can add a page using a link to a public artist profile. It is labeled fan-created until the artist verifies it. A verified artist can manage or remove their page.</p></details>
            <details><summary>What can an artist see about fans?</summary><p>A verified artist sees audience totals and claim numbers. They see a fan&apos;s name only if that fan chose to show it. Watches are never public.</p></details>
            <details><summary>Does a claim cost anything?</summary><p>No. ClaimedFirst is for recognition. There are no prizes, cash payouts, or paid claims.</p></details>
            <details><summary>Is ClaimedFirst part of a music platform?</summary><p>No. ClaimedFirst is independent of the sites where artists post their music. Song links take you to those sites.</p></details>
          </div>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-container">
          <p className="eyebrow">The record starts somewhere</p>
          <h2>Make room for the people who found the music first.</h2>
          <p>Join as a fan, or find your artist page and make it yours.</p>
          <div className="lp-actions"><Link className="btn" href="/login">Create an account</Link><Link className="btn secondary" href="/discover#search">Find your page</Link></div>
        </div>
      </section>
    </main>
  );
}
