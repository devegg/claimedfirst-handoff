"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function UnwatchButton({ artistId }: { artistId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function unwatch() {
    setBusy(true); setError(false);
    try {
      const { error: err } = await createClient().rpc("unwatch_artist", { p_artist: artistId });
      if (err) { setError(true); return; }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" onClick={unwatch} disabled={busy}>Remove</button>
      {error && <span role="alert"> Could not remove. Try again.</span>}
    </>
  );
}
