"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { claimErrorMessage } from "@/lib/claim-errors";
import { loadOwnDefaults } from "@/lib/own-defaults";
import type { ClaimVisibility } from "@/lib/visibility";
import VisibilitySheet from "./VisibilitySheet";
import HelpTip from "@/components/HelpTip";

export default function ClaimButton({
  artistId, artistName, nextNumber,
}: { artistId: string; artistName: string; nextNumber: number }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [initial, setInitial] = useState<ClaimVisibility | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  async function open() {
    setOpening(true); setError(null); setNeedsSignIn(false);
    const d = await loadOwnDefaults(createClient());
    setOpening(false);
    if (!d.signedIn) {
      setError(claimErrorMessage("not_authenticated"));
      setNeedsSignIn(true);
      return;
    }
    setInitial(d.claim);
  }

  async function claim(visibility: string) {
    let result;
    try {
      result = await createClient().rpc("claim_artist", { p_artist: artistId, p_visibility: visibility });
    } catch {
      throw new Error(claimErrorMessage(null));
    }
    if (result.error) throw new Error(claimErrorMessage(result.error.message));
    const num = (result.data as { claim_number?: number } | null)?.claim_number;
    if (typeof num !== "number") throw new Error(claimErrorMessage(null));
    setDone(num);
    router.refresh();
  }

  if (done !== null) return <p role="status" className="claim-success">You are Claim #{done}.</p>;
  return (
    <div>
      <button type="button" className="btn-primary" onClick={open} disabled={opening}>Claim as #{nextNumber}</button><HelpTip id="claim" />
      <p className="claim-note">Uses one of your roster slots. You choose who sees your name next.</p>
      {error && (
        <p role="alert">
          {error} {needsSignIn && <Link href="/login">Sign in</Link>}
        </p>
      )}
      {initial && (
        <VisibilitySheet
          mode="claim" artistName={artistName} initialValue={initial} confirmLabel="Claim"
          onConfirm={claim} onClose={() => setInitial(null)}
        />
      )}
    </div>
  );
}
