"use client";
import { useState } from "react";
import { toPng } from "html-to-image";
import ShareCard from "./ShareCard";
import type { RecordStyle } from "@/lib/record-styles";
import { ANON_LABEL, buildShareLink, type Milestone, type ShareVisibility } from "@/lib/share";

type Props = {
  mode: "claim" | "milestone";
  artistName: string; slug: string; claimNumber: number;
  /** The scout's own handle and the claim's visibility. */
  handle: string; visibility: ShareVisibility;
  referralCode: string | null; date: string; milestone?: Milestone;
  style?: RecordStyle;
};

export default function ShareAction(p: Props) {
  const [open, setOpen] = useState(false);
  const [ratio, setRatio] = useState<"story" | "square">("story");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const showHandle = p.visibility === "public" ? p.handle : null;
  const label = p.mode === "claim" ? "Share" : "Share milestone card";
  const file = `claimedfirst-${p.slug}-${p.claimNumber}${p.mode === "milestone" ? "-milestone" : ""}.png`;

  async function run() {
    setBusy(true); setStatus("");
    try {
      const node = document.getElementById(`share-card-${p.mode}-${p.slug}-${p.claimNumber}`);
      if (!node) throw new Error("no card");
      const link = buildShareLink(window.location.origin, p.slug, p.claimNumber, p.referralCode);
      const png = await toPng(node, { width: 1080, height: ratio === "story" ? 1920 : 1080, pixelRatio: 1, cacheBust: true });
      const blob = await (await fetch(png)).blob();
      const f = new File([blob], file, { type: "image/png" });
      // Link goes in text only: some share targets drop the files when a url is also present.
      const data = { files: [f], text: `${p.artistName}, Claim #${p.claimNumber}: ${link}` };
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [f] })) {
        try { await navigator.share(data); setStatus("Shared."); return; }
        catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") { setStatus("Sharing was cancelled. Nothing was sent."); return; }
          // any other failure: fall through to download and copy
        }
      }
      const a = document.createElement("a");
      a.href = png; a.download = file; a.click();
      try {
        await navigator.clipboard.writeText(link);
        setStatus("Card downloaded and link copied.");
      } catch {
        setStatus(`Card downloaded. Copy this link to share it: ${link}`);
      }
    } catch {
      setStatus("The card could not be made. Please try again.");
    } finally { setBusy(false); }
  }

  if (!open) return <button type="button" className="btn secondary" onClick={() => setOpen(true)}>{label}</button>;
  return (
    <div role="group" aria-label={label} className="share-studio">
      <p>Make an image you can save or send.</p>
      <p>{showHandle ? `The card will show @${showHandle}.` : `The card will not show your name (${ANON_LABEL}).`}</p>
      <div className="choices">
        <label><input type="radio" name={`r-${p.mode}-${p.slug}`} checked={ratio === "story"} onChange={() => setRatio("story")} /> Story</label>
        <label><input type="radio" name={`r-${p.mode}-${p.slug}`} checked={ratio === "square"} onChange={() => setRatio("square")} /> Square</label>
        <button type="button" className="btn-primary" onClick={run} disabled={busy}>{busy ? "Making card" : "Make card"}</button>
        <button type="button" className="plain" onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="preview-wrap" data-ratio={ratio} aria-hidden="true">
        <div className="preview-scale">
          <ShareCard mode={p.mode} ratio={ratio} artistName={p.artistName} slug={p.slug} claimNumber={p.claimNumber}
            handle={showHandle} date={p.date} milestone={p.milestone} style={p.style} />
        </div>
      </div>
      <p role="status">{status}</p>
      <div aria-hidden="true" className="share-offscreen">
        <div id={`share-card-${p.mode}-${p.slug}-${p.claimNumber}`}>
          <ShareCard mode={p.mode} ratio={ratio} artistName={p.artistName} slug={p.slug} claimNumber={p.claimNumber}
            handle={showHandle} date={p.date} milestone={p.milestone} style={p.style} />
        </div>
      </div>
    </div>
  );
}
