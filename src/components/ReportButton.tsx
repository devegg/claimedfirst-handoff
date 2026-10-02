"use client";
import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { MAX_REPORT_REASON, artistToolsErrorMessage } from "@/lib/song-rules";
import Modal from "./Modal";
import InfoTip from "./InfoTip";
import { REPORT_AGE_TIP } from "@/lib/info-copy";

/** `compact` is the small "Report" control for list rows; the button name still says which page. */
export default function ReportButton({ artistId, artistName, compact = false }: { artistId: string; artistName?: string; compact?: boolean }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooNew, setTooNew] = useState(false);
  const [done, setDone] = useState(false);

  function close() { setOpen(false); }

  async function send() {
    if (busy) return;
    const text = reason.trim();
    if (text.length < 1 || text.length > MAX_REPORT_REASON) { setError(artistToolsErrorMessage("invalid_reason")); return; }
    setBusy(true); setError(null); setTooNew(false);
    try {
      const { error: err } = await createClient().rpc("report_artist", { p_artist: artistId, p_reason: text });
      if (err) { setTooNew(err.message.includes("account_too_new")); setError(artistToolsErrorMessage(err.message)); return; }
      setDone(true);
    } catch {
      setError(artistToolsErrorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="plain" onClick={() => { setOpen(true); setDone(false); setError(null); setTooNew(false); setReason(""); }}
        aria-label={compact && artistName ? `Report ${artistName}` : undefined}>{compact ? "Report" : "Report this page"}</button>
      {open && (
        <Modal title="Report this page" onClose={close} busy={busy}>
          {done ? (
            <>
              <p role="status">Thanks. We have recorded your report.</p>
              <button type="button" onClick={close}>Close</button>
            </>
          ) : (
            <>
              <label htmlFor={`${uid}-r`}>Reason</label>
              <textarea
                id={`${uid}-r`} rows={4} value={reason}
                aria-describedby={`${uid}-c`}
                onChange={(e) => setReason(e.target.value)}
              />
              <div id={`${uid}-c`}><small>{reason.trim().length} of {MAX_REPORT_REASON} characters</small></div>
              {error && <div role="alert">{error}{tooNew && <InfoTip text={REPORT_AGE_TIP} label="Why do reports wait?" />}</div>}
              <div className="btn-row">
                <button type="button" onClick={send} disabled={busy}>Send report</button>
                <button type="button" onClick={close} disabled={busy}>Cancel</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
