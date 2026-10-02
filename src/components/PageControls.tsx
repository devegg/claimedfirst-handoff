"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { artistToolsErrorMessage } from "@/lib/song-rules";
import Modal from "./Modal";

/** delisted is read from the artist row; the other flag is always passed through unchanged. */
export default function PageControls({
  artistId, artistName, claimsFrozen, delisted,
}: { artistId: string; artistName: string; claimsFrozen: boolean; delisted: boolean }) {
  const router = useRouter();
  const uid = useId();
  const [frozen, setFrozen] = useState(claimsFrozen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function setState(freeze: boolean, delist: boolean): Promise<boolean> {
    setBusy(true); setError(null);
    try {
      const { error: err } = await createClient().rpc("set_artist_state", { p_artist: artistId, p_freeze: freeze, p_delist: delist });
      if (err) { setError(artistToolsErrorMessage(err.message)); return false; }
      return true;
    } catch {
      setError(artistToolsErrorMessage(null));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleFreeze() {
    const next = !frozen;
    if (await setState(next, delisted)) { setFrozen(next); router.refresh(); }
  }

  async function remove() {
    if (await setState(frozen, true)) { setConfirming(false); router.push("/"); router.refresh(); }
    else setConfirming(false);
  }

  return (
    <section aria-labelledby={`${uid}-h`} className="manage-section">
      <h2 id={`${uid}-h`}>Page controls</h2>
      <p>
        <button type="button" role="switch" aria-checked={frozen} aria-describedby={`${uid}-f`} disabled={busy} onClick={toggleFreeze}>
          Freeze new claims
        </button>{" "}
        <small>{frozen ? "On" : "Off"}</small>
      </p>
      <p id={`${uid}-f`}><small>While on, no new scouts can claim your page. Existing claim numbers stay in place.</small></p>
      <p><button type="button" onClick={() => setConfirming(true)} disabled={busy}>Remove my page</button></p>
      {error && <p role="alert">{error}</p>}
      {confirming && (
        <Modal title="Remove your page?" onClose={() => setConfirming(false)} busy={busy}>
          <p>
            {artistName} will disappear from ClaimedFirst. Scouts keep their claim numbers as history. You can ask us to restore the page later.
          </p>
          <div className="btn-row">
            <button type="button" onClick={remove} disabled={busy}>Remove page</button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
