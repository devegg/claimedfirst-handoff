"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { FIELD_MESSAGES, MAX_SONGS, artistToolsErrorMessage, validateSongs, type SongRow } from "@/lib/song-rules";

export default function TopSongsEditor({ artistId, initial }: { artistId: string; initial: SongRow[] }) {
  const router = useRouter();
  const uid = useId();
  const [rows, setRows] = useState<SongRow[]>(initial.length ? initial : [{ title: "", url: "" }]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const result = validateSongs(rows);

  function edit(i: number, patch: Partial<SongRow>) {
    setSaved(false);
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (!result.ok || busy) return;
    setBusy(true); setError(null); setSaved(false);
    try {
      const { error: err } = await createClient().rpc("set_top_songs", { p_artist: artistId, p_songs: result.songs });
      if (err) { setError(artistToolsErrorMessage(err.message)); return; }
      setSaved(true);
      router.refresh();
    } catch {
      setError(artistToolsErrorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${uid}-h`} className="manage-section">
      <h2 id={`${uid}-h`}>Top Songs</h2>
      <p>Up to {MAX_SONGS} songs. Edit any row, then save.</p>
      {rows.length >= MAX_SONGS && <p role="note">You have reached {MAX_SONGS} songs. Remove one to add another.</p>}
      <p>Each needs a title and an https:// link. They show on your page in this order.</p>
      <ol className="list-reset">
        {rows.map((r, i) => {
          const res = result.rows[i];
          const n = i + 1;
          const titleMsg = res.titleError ? FIELD_MESSAGES[res.titleError] : null;
          const urlMsg = res.urlError ? FIELD_MESSAGES[res.urlError] : null;
          return (
            <li key={i} className="stack-row">
              <div className="field-row">
                <div className="field">
                <label htmlFor={`${uid}-ti${i}`}>Song title{" "}<span className="sr-only">{n}</span></label>
                <input
                  id={`${uid}-ti${i}`} value={r.title} maxLength={200}
                  aria-invalid={titleMsg ? true : undefined} aria-describedby={titleMsg ? `${uid}-t${i}` : undefined}
                  onChange={(e) => edit(i, { title: e.target.value })}
                />
                </div>
                <div className="field">
                <label htmlFor={`${uid}-li${i}`}>Song link{" "}<span className="sr-only">{n}</span></label>
                <input
                  id={`${uid}-li${i}`} value={r.url} inputMode="url" placeholder="https://"
                  aria-invalid={urlMsg ? true : undefined} aria-describedby={urlMsg ? `${uid}-u${i}` : undefined}
                  onChange={(e) => edit(i, { url: e.target.value })}
                />
                </div>
                <button type="button" aria-label={`Remove song ${n}`} onClick={() => { setSaved(false); setRows((rs) => rs.filter((_, j) => j !== i)); }}>
                  Remove
                </button>
              </div>
              {titleMsg && <div id={`${uid}-t${i}`}><small>{titleMsg}</small></div>}
              {urlMsg && <div id={`${uid}-u${i}`}><small>{urlMsg}</small></div>}
            </li>
          );
        })}
      </ol>
      <p>
        <button type="button" onClick={() => setRows((rs) => [...rs, { title: "", url: "" }])} disabled={rows.length >= MAX_SONGS}>Add song</button>{" "}
        {rows.length >= MAX_SONGS && <small>You have reached {MAX_SONGS} songs.</small>}
      </p>
      <p>
        <button type="button" className="btn-primary" onClick={save} disabled={busy || !result.ok}>Save songs</button>{" "}
        <small>{result.summary}</small>
      </p>
      {saved && <p role="status">Saved. Your Top Songs are live on your page.</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
