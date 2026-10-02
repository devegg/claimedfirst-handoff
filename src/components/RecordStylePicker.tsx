"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { artistToolsErrorMessage } from "@/lib/song-rules";
import { RECORD_STYLES, RECORD_STYLE_LABELS, resolveRecordStyle, type RecordStyle } from "@/lib/record-styles";
import Record from "./Record";

export default function RecordStylePicker({ artistId, slug, stored }: { artistId: string; slug: string; stored: string | null }) {
  const router = useRouter();
  const uid = useId();
  const [choice, setChoice] = useState<RecordStyle>(resolveRecordStyle(stored, slug));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(style: RecordStyle | null) {
    if (busy) return;
    setBusy(true); setError(null); setSaved(null);
    try {
      const { error: err } = await createClient().rpc("set_record_style", { p_artist: artistId, p_style: style });
      if (err) { setError(artistToolsErrorMessage(err.message)); return; }
      if (style === null) {
        setChoice(resolveRecordStyle(null, slug));
        setSaved("Saved. Your page uses the default record.");
      } else {
        setSaved("Saved. Your page shows this record.");
      }
      router.refresh();
    } catch {
      setError(artistToolsErrorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${uid}-h`} className="manage-section">
      <h2 id={`${uid}-h`}>Record style</h2>
      <p>Every page shows a generated record. Pick the look for yours.</p>
      <div role="radiogroup" aria-label="Record style" className="record-choices">
        {RECORD_STYLES.map((s) => (
          <label key={s} className="record-choice" data-selected={choice === s}>
            <Record style={s} size={56} decorative />
            <span>
              <input type="radio" name={`${uid}-style`} value={s} checked={choice === s}
                onChange={() => { setChoice(s); setSaved(null); }} aria-label={RECORD_STYLE_LABELS[s]} />{" "}
              {RECORD_STYLE_LABELS[s]}
            </span>
          </label>
        ))}
      </div>
      <p>
        <button type="button" className="btn-primary" onClick={() => send(choice)} disabled={busy} aria-label="Save record style">Save</button>{" "}
        <button type="button" onClick={() => send(null)} disabled={busy}>Use the default</button>
      </p>
      {saved && <p role="status">{saved}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
