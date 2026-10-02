import { formatBoardDate, boardRowState, BOARD_EMPTY_TEXT, BOARD_NOTE, type BoardClaimFlags } from "@/lib/boards";
import { PROVISIONAL_TIP } from "@/lib/info-copy";
import HelpTip from "@/components/HelpTip";
import InfoTip from "@/components/InfoTip";

export type FounderRow = { claim_number: number; handle: string; status: string; claimed_at: string } & Omit<BoardClaimFlags, "status">;

export default function FoundersBoard({ rows }: { rows: FounderRow[] }) {
  return (
    <section aria-labelledby="founders-h" className="panel">
      <h2 id="founders-h">Founders <HelpTip id="founders-board" /></h2>
      {rows.length === 0 ? <p>{BOARD_EMPTY_TEXT}</p> : (
        <ol className="founders">
          {rows.map((r) => {
            const st = boardRowState(r);
            const cls = st.kind === "provisional" ? "board-row row-provisional" : st.kind === "dropped_early" ? "board-row row-dropped-early" : "board-row";
            return (
              <li key={r.claim_number} className={cls}>
                <span className="board-num">#{r.claim_number}</span> <span>{r.handle}</span>
                {st.kind === "historical" && <> <small className="badge">{st.text}</small></>}
                {(st.kind === "provisional" || st.kind === "dropped_early") && <> <small className="board-meta">{st.kind === "provisional" ? "Provisional, " : ""}{st.text}</small></>}
                {" "}<small className="board-meta">{formatBoardDate(r.claimed_at)}</small>
              </li>
            );
          })}
        </ol>
      )}
      <div className="hold-note">{BOARD_NOTE}<InfoTip text={PROVISIONAL_TIP} label="What is a provisional claim?" guide="hold-14" /></div>
    </section>
  );
}
