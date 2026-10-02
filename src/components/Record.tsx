import type { CSSProperties } from "react";
import { RECORD_PALETTE, type RecordStyle } from "@/lib/record-styles";

/** Generated placeholder artwork: a pure-CSS record with groove rings and a colored label. No images, no animation. */
export default function Record({ style, size, decorative = false }: { style: RecordStyle; size: number; decorative?: boolean }) {
  const p = RECORD_PALETTE[style];
  const css = {
    "--record-vinyl": p.vinyl, "--record-groove": p.groove, "--record-label": p.label,
    width: size, height: size, flex: "none", borderRadius: "50%", boxSizing: "border-box",
    background: `radial-gradient(circle, var(--record-label) 0 17%, var(--record-vinyl) 17.5% 20%, transparent 20.5%),
      repeating-radial-gradient(circle, var(--record-vinyl) 0 2px, var(--record-groove) 2px 3px)`,
    boxShadow: "inset 0 0 0 1px var(--record-groove)",
  } as CSSProperties;
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img" as const, "aria-label": "Placeholder artwork" };
  return <div className="record" data-style={style} style={css} {...a11y} />;
}
