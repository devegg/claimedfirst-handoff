import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Landing from "@/components/Landing";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data?.user);
  if (!signedIn) return <Landing />;
  return (
    <main>
      <div className="hero">
        <div>
          <p className="eyebrow">Back artists early</p>
          <h1>ClaimedFirst</h1>
          <p className="lede">Find them first. Keep the number.</p>
          <div className="hero-actions">
            <Link href="/discover" className="btn">Discover artists</Link>
            <Link href="/submit" className="btn secondary">Add an artist</Link>
          </div>
          <ul className="list" aria-label="Quick links">
            {signedIn ? <li><Link href="/roster">Your roster</Link></li> : <li><Link href="/login">Sign in</Link></li>}
            <li><Link href="/leaderboard">Leaderboard</Link></li>
            <li><Link href="/guide">Guide</Link></li>
          </ul>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="disc" /></div>
      </div>
    </main>
  );
}
