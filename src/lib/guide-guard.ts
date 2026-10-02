const WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred";

export const LADDER_TEXT = "2 friends open 10 slots, 5 friends open 20 slots, 10 friends open 30 slots and 20 friends open 50 slots";

/**
 * The slot ladder is public, so the guide may state it, but only as this one exact sentence (LADDER_TEXT).
 * Any other friend count or slot number is still flagged, so figures cannot drift into other entries.
 * Also allowed: "Everyone starts with 5 slots", "You start with 5 slots" and "You start with 5". Returns the offending match, or null.
 */
export function findNumberLeak(raw: string): string | null {
  const text = raw.split(LADDER_TEXT).join("").replace(/Everyone starts with 5 slots/g, "").replace(/You start with 5/g, "");
  const patterns = [
    /\d+\s+(?:roster\s+)?(?:slots?|friends?|referrals?)\b/i,
    new RegExp(`\\b(?:${WORDS})\\s+(?:roster\\s+)?(?:slots|friends|referrals)\\b`, "i"),
    /\b(?:slots?|friends?)\s+\d+/i,
    /referral[\s\S]{0,40}\d|\d[\s\S]{0,40}referral/i,
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}
