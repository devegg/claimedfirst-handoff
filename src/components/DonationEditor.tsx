"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { FIELD_MESSAGES, artistToolsErrorMessage, validateDonationUrl } from "@/lib/song-rules";

export default function DonationEditor({ artistId, initial }: { artistId: string; initial: string | null }) {
  const router = useRouter();
  const uid = useId();
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invalid = validateDonationUrl(value.trim());

  async function save() {
    if (invalid || busy) return;
    setBusy(true); setError(null); setSaved(null);
    const url = value.trim();
    try {
      const { error: err } = await createClient().rpc("set_donation_url", { p_artist: artistId, p_url: url === "" ? null : url });
      if (err) { setError(artistToolsErrorMessage(err.message)); return; }
      setSaved(url === "" ? "Removed. Your page no longer shows a support button." : "Saved. Your page now shows a support button.");
      router.refresh();
    } catch {
      setError(artistToolsErrorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${uid}-h`} className="manage-section">
      <h2 id={`${uid}-h`}>Support button</h2>
      <p>Where fans can tip or buy from you. Leave it blank to show no support button.</p>
      <input
        aria-label="Support link" value={value} inputMode="url" placeholder="https://" maxLength={400}
        aria-invalid={invalid ? true : undefined} aria-describedby={invalid ? `${uid}-e` : undefined}
        onChange={(e) => { setValue(e.target.value); setSaved(null); }}
      />{" "}
      <button type="button" onClick={save} disabled={busy || !!invalid} className="btn-primary" aria-label="Save support link">Save</button>
      {invalid && <div id={`${uid}-e`}><small>{FIELD_MESSAGES[invalid]}</small></div>}
      {saved && <p role="status">{saved}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
