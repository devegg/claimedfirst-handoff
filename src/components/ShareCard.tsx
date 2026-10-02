import type { CSSProperties } from "react";
import { RECORD_PALETTE, type RecordStyle } from "@/lib/record-styles";
import { formatClaimDate, formatCount, siteHost, SITE_URL, type Milestone } from "@/lib/share";

export type ShareCardProps = {
  mode: "claim" | "milestone";
  ratio: "story" | "square";
  artistName: string;
  slug: string;
  claimNumber: number;
  /** Real handle, only for public claims. Null hides the line. */
  handle: string | null;
  date: string;
  milestone?: Milestone;
  /** Record style for the rings and label color. Defaults to classic. */
  style?: RecordStyle;
};

// Fraunces when the page has loaded it (html-to-image embeds the font); Georgia is the safe fallback.
const SERIF = 'var(--font-fraunces), Georgia, "Times New Roman", serif';
const BODY = 'var(--font-dm-sans), Arial, sans-serif';

/** Drawn at full export size (1080 wide); the browser renders it to PNG with html-to-image. */
export default function ShareCard({ mode, ratio, artistName, slug, claimNumber, handle, date, milestone, style = "classic" }: ShareCardProps) {
  const pal = RECORD_PALETTE[style];
  const claimedOn = formatClaimDate(date);
  const h = ratio === "story" ? 1920 : 1080;
  const root = {
    "--record-label": pal.label, "--record-groove": pal.groove,
    position: "relative", overflow: "hidden", boxSizing: "border-box", width: "1080px", height: `${h}px`,
    background: "radial-gradient(circle at 80% 0, #283429 0, #121613 55%)", color: "#f3efe5", fontFamily: SERIF, padding: 80,
    display: "flex", flexDirection: "column", justifyContent: "space-between",
  } as CSSProperties;
  const big = ratio === "story" ? 420 : 300;
  const rings = [260, 380, 500, 620, 740, 860];
  return (
    <div className={`share-card ${ratio} ${mode}`} data-ratio={ratio} data-mode={mode} data-style={style} style={root}>
      <svg aria-hidden="true" width="1080" height={h} viewBox={`0 0 1080 ${h}`}
        style={{ position: "absolute", inset: 0, opacity: 0.6 }}>
        {rings.map((r) => <circle key={r} cx="540" cy={h / 2} r={r} fill="none" stroke={pal.groove} strokeWidth="2" />)}
        <circle cx="540" cy={h / 2} r="120" fill={pal.label} opacity="0.18" />
      </svg>
      <div style={{ position: "relative", fontSize: 34, letterSpacing: "0.3em", fontFamily: BODY, fontWeight: 700, color: "#e48c72" }}>CLAIMEDFIRST</div>
      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{ fontSize: 52, letterSpacing: "0.2em", fontFamily: BODY, fontWeight: 600, color: "#bac4b8" }}>{mode === "claim" ? "I CLAIMED" : "I WAS EARLY"}</div>
        <div style={{ fontSize: big, lineHeight: 1, color: pal.label, fontWeight: 700 }}>{`#${claimNumber}`}</div>
        {mode === "milestone" && milestone && (
          <div style={{ fontSize: 48, marginTop: 20 }}>{`#${claimNumber} of ${formatCount(milestone)} claimers now.`}</div>
        )}
        <div style={{ fontSize: 88, marginTop: 40, letterSpacing: "-0.03em" }}>{artistName}</div>
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", fontSize: 32, fontFamily: BODY, color: "#bac4b8" }}>
        <div>
          {claimedOn && <div>{`Claimed ${claimedOn}`}</div>}
          {handle && <div>{`@${handle}`}</div>}
        </div>
        <div>{`${siteHost(SITE_URL)}/artist/${slug}`}</div>
      </div>
    </div>
  );
}
