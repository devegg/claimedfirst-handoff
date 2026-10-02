import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDefaults } from "@/lib/visibility";
import { signOut } from "@/app/auth/actions";
import SettingsForm from "@/components/SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // Own rows only (RLS). The counts mirror what the bulk functions will touch.
  const { data: profile } = await supabase
    .from("profiles").select("default_claim_visibility,default_watch_named").eq("id", auth.user.id).maybeSingle();
  const [claims, watches] = await Promise.all([
    supabase.from("claims").select("*", { count: "exact", head: true }),
    supabase.from("watchlist").select("*", { count: "exact", head: true }),
  ]);
  const defaults = parseDefaults(profile);

  return (
    <main className="narrow">
      <h1>Who sees your name</h1>
      <p><Link href="/roster">Back to your Roster</Link></p>
      <SettingsForm
        initialClaim={defaults.claim}
        initialWatch={defaults.watch}
        claimCount={claims.error ? null : (claims.count ?? 0)}
        watchCount={watches.error ? null : (watches.count ?? 0)}
      />
      <section aria-labelledby="signout-h" className="panel panel-spaced">
        <h2 id="signout-h" className="flush-top">Sign out</h2>
        <p>End your session on this device.</p>
        <form action={signOut}><button type="submit" className="btn secondary">Sign out</button></form>
      </section>
    </main>
  );
}
