export const RECORD_STYLES = ["classic", "ember", "tide", "paper", "night", "dusk"] as const;
export type RecordStyle = (typeof RECORD_STYLES)[number];

export function isRecordStyle(x: string): x is RecordStyle {
  return (RECORD_STYLES as readonly string[]).includes(x);
}

export function defaultStyleFor(slug: string): RecordStyle {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  return RECORD_STYLES[Math.abs(h) % RECORD_STYLES.length];
}

/** The stored style when it is a known one, otherwise the slug's default. */
export function resolveRecordStyle(stored: string | null | undefined, slug: string): RecordStyle {
  return stored && isRecordStyle(stored) ? stored : defaultStyleFor(slug);
}

/** vinyl = disc body, groove = ring color, label = center label, ink = text on the card. */
export const RECORD_PALETTE: Record<RecordStyle, { vinyl: string; groove: string; label: string }> = {
  classic: { vinyl: "#151311", groove: "#3a3631", label: "#e2472b" },
  ember: { vinyl: "#1c0f0a", groove: "#4a2a1c", label: "#f08a24" },
  tide: { vinyl: "#0c1a22", groove: "#23465a", label: "#2fb3a6" },
  paper: { vinyl: "#d9d0c0", groove: "#b9ad97", label: "#7a4b32" },
  night: { vinyl: "#0a0a14", groove: "#2a2a4a", label: "#7b6cf6" },
  dusk: { vinyl: "#22121f", groove: "#5a2f4d", label: "#e0709a" },
};

export const RECORD_STYLE_LABELS: Record<RecordStyle, string> = {
  classic: "Classic", ember: "Ember", tide: "Tide", paper: "Paper", night: "Night", dusk: "Dusk",
};
