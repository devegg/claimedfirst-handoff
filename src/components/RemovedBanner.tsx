"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { artistToolsErrorMessage } from "@/lib/song-rules";

/** Shown to the owner of a delisted page. Restoring passes the freeze flag through unchanged. */
export default function RemovedBanner({
  artistId, artistName, claimsFrozen,
}: { artistId: string; artistName: string; claimsFrozen: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const { error: err } = await createClient().rpc("set_artist_state", { p_artist: artistId, p_freeze: claimsFrozen, p_delist: false });
      if (err) { setError(artistToolsErrorMessage(err.message)); return; }
      router.refresh();
    } catch {
      setError(artistToolsErrorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="removed-h" className="panel">
      <h2 id="removed-h">Your page is removed</h2>
      <p>{artistName} is hidden from ClaimedFirst. Scouts keep their claim numbers as history. Bring the page back whenever you are ready.</p>
      <button type="button" className="btn-primary" onClick={restore} disabled={busy}>Bring my page back</button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
