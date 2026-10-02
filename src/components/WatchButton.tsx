"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { saveErrorMessage, watchErrorCode, watchErrorMessage } from "@/lib/claim-errors";
import { loadOwnDefaults } from "@/lib/own-defaults";
import { watchLevelFromNamed, watchLevelLabel, type WatchLevel } from "@/lib/visibility";
import VisibilitySheet from "./VisibilitySheet";
import HelpTip from "@/components/HelpTip";

/** initialNamed: null when the scout is not watching, otherwise whether their name is visible to the artist. */
export default function WatchButton({
  artistId, artistName, initialNamed,
}: { artistId: string; artistName: string; initialNamed: boolean | null }) {
  const router = useRouter();
  const [named, setNamed] = useState<boolean | null>(initialNamed);
  const [sheetValue, setSheetValue] = useState<WatchLevel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  async function open() {
    setBusy(true); setError(null); setNeedsSignIn(false);
    const d = await loadOwnDefaults(createClient());
    setBusy(false);
    if (!d.signedIn) {
      setError(watchErrorMessage("not_authenticated"));
      setNeedsSignIn(true);
      return;
    }
    setSheetValue(d.watch);
  }

  async function watch(value: string) {
    const wantNamed = value === "named";
    let result;
    try {
      result = await createClient().rpc("watch_artist", { p_artist: artistId, p_named: wantNamed });
    } catch {
      throw new Error(watchErrorMessage(null));
    }
    if (result.error) throw new Error(watchErrorMessage(result.error.message));
    setNamed(wantNamed);
    router.refresh();
  }

  async function changePrivacy(value: string) {
    const wantNamed = value === "named";
    let result;
    try {
      result = await createClient().rpc("set_watch_named", { p_artist: artistId, p_named: wantNamed });
    } catch {
      throw new Error(saveErrorMessage(null));
    }
    if (result.error) throw new Error(saveErrorMessage(result.error.message));
    setNamed(wantNamed);
    router.refresh();
  }

  async function stop() {
    setBusy(true); setError(null); setNeedsSignIn(false);
    try {
      const { error: err } = await createClient().rpc("unwatch_artist", { p_artist: artistId });
      if (err) {
        setError(watchErrorMessage(err.message));
        setNeedsSignIn(watchErrorCode(err.message) === "not_authenticated");
        return;
      }
      setNamed(null);
      router.refresh();
    } catch {
      setError(watchErrorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  const watching = named !== null;
  return (
    <div>
      {watching ? (
        <p className="watching">
          <span className="badge">Watching</span>{" "}
          <small>({watchLevelLabel(watchLevelFromNamed(named))})</small><HelpTip id="watchlist" />{" "}
          <button type="button" onClick={() => { setError(null); setSheetValue(watchLevelFromNamed(named)); }} disabled={busy}>Change privacy</button>{" "}
          <button type="button" onClick={stop} disabled={busy}>Stop watching</button>
        </p>
      ) : (
        <><button type="button" onClick={open} disabled={busy}>Watch</button><HelpTip id="watchlist" /></>
      )}
      {error && (
        <p role="alert">
          {error} {needsSignIn && <Link href="/login">Sign in</Link>}
        </p>
      )}
      {sheetValue && (
        <VisibilitySheet
          mode="watch"
          artistName={artistName}
          initialValue={sheetValue}
          confirmLabel={watching ? "Save choice" : "Watch"}
          title={watching ? `Privacy for ${artistName}` : undefined}
          onConfirm={watching ? changePrivacy : watch}
          onClose={() => setSheetValue(null)}
        />
      )}
    </div>
  );
}
