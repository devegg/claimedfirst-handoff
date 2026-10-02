"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { claimErrorCode, claimErrorMessage } from "@/lib/claim-errors";
import HelpTip from "@/components/HelpTip";
import InfoTip from "@/components/InfoTip";
import { formatUnlockDateTime, formatLocalDateTime } from "@/lib/claim-errors";
import { LOCK_TIP } from "@/lib/info-copy";

export default function DropButton({ claimId, artistName, lockedUntil = null }: { claimId: string; artistName: string; lockedUntil?: string | null }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function drop() {
    setBusy(true); setError(null);
    try {
      const { error: err } = await createClient().rpc("drop_claim", { p_claim: claimId });
      if (err) {
        setError(claimErrorCode(err.message) === "claim_locked"
          ? claimErrorMessage(err.message, err.details)
          : "Could not drop this claim. Try again.");
        return;
      }
      dialog.current?.close();
      router.refresh();
    } catch {
      setError("Could not drop this claim. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // UTC while rendering on the server, then the viewer's own time with its timezone label.
  const unlock = useSyncExternalStore(
    () => () => {},
    () => formatLocalDateTime(lockedUntil),
    () => formatUnlockDateTime(lockedUntil),
  );
  if (unlock) {
    const id = `lock-${claimId}`;
    return (
      <span className="lock-note">
        <button type="button" disabled aria-describedby={id}>Drop</button>{" "}
        <span id={id}>Locked until {unlock}</span>
        <InfoTip text={LOCK_TIP} label="Why is this claim locked?" guide="claim-lock" />
      </span>
    );
  }
  return (
    <>
      <button type="button" onClick={() => { setError(null); dialog.current?.showModal(); }}>Drop</button>
      <dialog ref={dialog} aria-label={`Drop ${artistName}`}>
        <p>Drop {artistName}?</p>
        <ul>
          <li>Your slot is freed.</li>
          <li>The claim moves to Historical claims and keeps its number and date.</li>
          <li>It stops earning points.</li>
          <li>Coming back to {artistName} takes 30 days, and the new claim gets a later number. <HelpTip id="wait-30" /></li>
        </ul>
        {error && <p role="alert">{error}</p>}
        <button type="button" onClick={drop} disabled={busy}>Drop claim</button>{" "}
        <button type="button" onClick={() => dialog.current?.close()} disabled={busy}>Keep claim</button>
      </dialog>
    </>
  );
}
