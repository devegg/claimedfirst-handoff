import HelpTip from "@/components/HelpTip";
import InfoTip from "@/components/InfoTip";
import { FRIEND_TIP } from "@/lib/info-copy";

export type ReferralRow = {
  handle: string | null; joined_on: string | null; status: string | null; days_left: number | null; has_claim: boolean | null;
  qualified_count: number; next_friends: number | null; next_slots: number | null;
};

/** The public ladder (migration 0003 and recompute_slots): friends needed for each slot level. */
export const LADDER: { friends: number; slots: number }[] = [
  { friends: 2, slots: 10 }, { friends: 5, slots: 20 }, { friends: 10, slots: 30 }, { friends: 20, slots: 50 },
];

export function nextUnlockLine(r: Pick<ReferralRow, "next_friends" | "next_slots"> | undefined): string {
  if (!r || r.next_friends == null || r.next_slots == null) return "You have all 50 slots.";
  return `Next step: ${r.next_friends} friends who joined and made a claim open ${r.next_slots} slots.`;
}

export default function FriendsAndSlots({ rows, inviteLink }: { rows: ReferralRow[]; inviteLink: string | null }) {
  const first = rows[0];
  const friends = rows.filter((r) => r.handle);
  return (
    <section aria-labelledby="friends-h" className="panel">
      <h2 id="friends-h" className="flush-top">Friends and slots <HelpTip id="referral-ladder" /></h2>
      <p>{nextUnlockLine(first)}</p>
      <p className="dim">
        The steps: {LADDER.map((s) => `${s.friends} friends, ${s.slots} slots`).join("; ")}. You start with 5 slots.
      </p>
      <p className="dim">Slots update overnight.</p>
      <p>Friends counted so far: {first?.qualified_count ?? 0}.</p>
      {friends.length === 0 ? <p className="dim">No friends have joined with your link yet.</p> : (
        <ul className="friend-list">
          {friends.map((f) => (
            <li key={f.handle}>
              <strong>{f.handle}</strong>, joined {f.joined_on}:{" "}
              {f.status === "counted"
                ? "counted"
                : <>pending{f.days_left ? `, ${f.days_left} ${f.days_left === 1 ? "day" : "days"} left` : f.has_claim ? "" : ", no claim yet"}<InfoTip text={FRIEND_TIP} label="When does a friend count?" /></>}
            </li>
          ))}
        </ul>
      )}
      {inviteLink && <p>Your invite link: <span className="invite-link">{inviteLink}</span></p>}
    </section>
  );
}
