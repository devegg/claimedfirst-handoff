import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/submit", label: "Add an artist" },
  { href: "/roster", label: "Roster" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/guide", label: "Guide" },
] as const;

export default async function SiteHeader() {
  let handle: string | null = null;
  let signedIn = false;
  let owned: { name: string; slug: string }[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      signedIn = true;
      const { data: p } = await supabase.from("profiles").select("handle").eq("id", data.user.id).maybeSingle();
      handle = p?.handle ?? null;
      const { data: o } = await supabase.rpc("my_owned_artists");
      owned = Array.isArray(o) ? (o as { name: string; slug: string }[]) : [];
    }
  } catch {
    signedIn = false;
  }
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand">Claimed<i>First</i></Link>
        <nav aria-label="Main" className="main-nav">
          {NAV_LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
        {signedIn
          ? (
            <details className="account-menu">
              <summary className="account-link">{handle ? `@${handle}` : "Account"}</summary>
              <ul className="account-menu-list list-reset">
                {owned.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/artist/${a.slug}`}>{a.name}</Link>
                    <Link href={`/artist/${a.slug}/manage`} className="account-menu-sub">Manage page</Link>
                  </li>
                ))}
                <li><Link href="/roster">Your roster</Link></li>
                <li><Link href="/settings">Settings</Link></li>
                <li>
                  <form action={signOut}><button type="submit" className="account-menu-signout">Sign out</button></form>
                </li>
              </ul>
            </details>
          )
          : <Link href="/login" className="account-link">Sign in</Link>}
      </div>
    </header>
  );
}
