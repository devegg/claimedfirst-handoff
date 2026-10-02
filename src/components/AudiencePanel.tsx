"use client";
import { useId, useState } from "react";

export type AudienceRow = {
  kind: "claimer" | "watcher";
  handle: string;
  claim_number: number | null;
  status: string | null;
  since: string;
};

const day = (iso: string) => iso.slice(0, 10);

export default function AudiencePanel({ rows, counts }: { rows: AudienceRow[]; counts: { total: number; named: number } }) {
  const uid = useId();
  const [tab, setTab] = useState<"claimed" | "watching">("claimed");
  const claimers = rows.filter((r) => r.kind === "claimer");
  const watchers = rows.filter((r) => r.kind === "watcher");
  const anonymous = Math.max(0, counts.total - counts.named);

  return (
    <section aria-labelledby={`${uid}-h`} className="manage-section">
      <h2 id={`${uid}-h`}>Audience</h2>
      <div role="tablist" aria-label="Audience" className="tabs">
        <button role="tab" type="button" id={`${uid}-tc`} aria-controls={`${uid}-pc`} aria-selected={tab === "claimed"} onClick={() => setTab("claimed")}>
          Claimed · {claimers.length}
        </button>
        <button role="tab" type="button" id={`${uid}-tw`} aria-controls={`${uid}-pw`} aria-selected={tab === "watching"} onClick={() => setTab("watching")}>
          Watching · {counts.total}
        </button>
      </div>
      {tab === "claimed" ? (
        <div role="tabpanel" id={`${uid}-pc`} aria-labelledby={`${uid}-tc`}>
          {claimers.length === 0 ? <p>No claims yet.</p> : (
            <ul>
              {claimers.map((r, i) => (
                <li key={i}>
                  #{r.claim_number} <span>{r.handle}</span>{" "}
                  {r.status === "historical" && <small>Historical</small>}{" "}
                  <small>since {day(r.since)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div role="tabpanel" id={`${uid}-pw`} aria-labelledby={`${uid}-tw`}>
          <p>{counts.total} watching: {counts.named} named, {anonymous} anonymous</p>
          {watchers.length > 0 && (
            <ul>
              {watchers.map((r, i) => (
                <li key={i}><span>{r.handle}</span> <small>since {day(r.since)}</small></li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p><small>Each scout chooses who sees their name. Anonymous scouts still count, but you will never see who they are.</small></p>
    </section>
  );
}
