"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { saveErrorMessage } from "@/lib/claim-errors";
import VisibilitySheet from "./VisibilitySheet";

type Props = { artistName: string } & (
  | { kind: "claim"; claimId: string; current: string }
  | { kind: "watch"; artistId: string; current: string }
);

/** Opens the visibility sheet in edit mode for an existing claim or watch. */
export default function PrivacyButton(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function save(value: string) {
    const supabase = createClient();
    let result;
    try {
      result = props.kind === "claim"
        ? await supabase.rpc("set_claim_visibility", { p_claim: props.claimId, p_visibility: value })
        : await supabase.rpc("set_watch_named", { p_artist: props.artistId, p_named: value === "named" });
    } catch {
      throw new Error(saveErrorMessage(null));
    }
    if (result.error) throw new Error(saveErrorMessage(result.error.message));
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Privacy</button>
      {open && (
        <VisibilitySheet
          mode={props.kind} artistName={props.artistName} initialValue={props.current}
          title={`Privacy for ${props.artistName}`} confirmLabel="Save choice"
          onConfirm={save} onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
