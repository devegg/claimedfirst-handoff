"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { saveErrorMessage } from "@/lib/claim-errors";
import {
  CLAIM_OPTIONS, WATCH_OPTIONS, claimLevelLabel, watchLevelLabel,
  type ClaimVisibility, type WatchLevel, type SheetOption,
} from "@/lib/visibility";

function RadioGroup({ legend, name, options, value, onChange, disabled }: {
  legend: string; name: string; options: SheetOption<string>[]; value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="fieldset-gap">
      <legend>{legend}</legend>
      {options.map((o) => (
        <div key={o.value} className="opt-block">
          <label>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} /> <strong>{o.label}</strong>
          </label>
          {o.description && <div className="opt-desc">{o.description}</div>}
        </div>
      ))}
    </fieldset>
  );
}

function BulkSection({ title, noun, options, count, labelOf, apply }: {
  title: string; noun: "claims" | "watches"; options: SheetOption<string>[]; count: number | null;
  labelOf: (v: string) => string; apply: (v: string) => Promise<number | null>;
}) {
  const id = useId();
  const [value, setValue] = useState(options[0].value);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const plural = (n: number) => `${n} ${n === 1 ? (noun === "claims" ? "claim" : "watch") : noun}`;

  async function run() {
    setBusy(true); setMessage(null);
    try {
      const n = await apply(value);
      setMessage({ kind: "ok", text: n === null ? `Done. Your ${noun} are set to ${labelOf(value)}.` : `Done. ${plural(n)} set to ${labelOf(value)}.` });
      setConfirming(false);
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : saveErrorMessage(null) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sub-panel">
      <h3>{title}</h3>
      <label htmlFor={id}>{title}</label>{" "}
      <select id={id} value={value} disabled={busy || confirming} onChange={(e) => { setValue(e.target.value); setMessage(null); }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>{" "}
      {!confirming && (
        <button type="button" onClick={() => { setMessage(null); setConfirming(true); }}>Review change to {noun}</button>
      )}
      {confirming && (
        <div>
          <p>
            {count === null
              ? `This will change all of your existing ${noun} to ${labelOf(value)}.`
              : `This will change ${plural(count)} to ${labelOf(value)}.`}
          </p>
          <button type="button" onClick={run} disabled={busy}>Confirm change to {noun}</button>{" "}
          <button type="button" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
        </div>
      )}
      {message && (message.kind === "ok" ? <p role="status">{message.text}</p> : <p role="alert">{message.text}</p>)}
    </section>
  );
}

export default function SettingsForm({ initialClaim, initialWatch, claimCount, watchCount }: {
  initialClaim: ClaimVisibility; initialWatch: WatchLevel; claimCount: number | null; watchCount: number | null;
}) {
  const router = useRouter();
  const [claim, setClaim] = useState<string>(initialClaim);
  const [watch, setWatch] = useState<string>(initialWatch);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function saveDefaults() {
    setBusy(true); setMessage(null);
    try {
      const { error } = await createClient().rpc("set_default_visibility", { p_claim: claim, p_watch: watch === "named" });
      if (error) { setMessage({ kind: "error", text: saveErrorMessage(error.message) }); return; }
      setMessage({ kind: "ok", text: "Defaults saved. They apply to new claims and watches." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: saveErrorMessage(null) });
    } finally {
      setBusy(false);
    }
  }

  async function bulk(rpcName: "set_all_claim_visibility" | "set_all_watch_named", args: Record<string, unknown>) {
    let result;
    try {
      result = await createClient().rpc(rpcName, args);
    } catch {
      throw new Error(saveErrorMessage(null));
    }
    if (result.error) throw new Error(saveErrorMessage(result.error.message));
    router.refresh();
    return typeof result.data === "number" ? result.data : null;
  }

  return (
    <>
      <section aria-labelledby="defaults-h">
        <h2 id="defaults-h">For new claims and watches</h2>
        <p>These choices apply to claims and watches you make from now on. Nothing you already have changes.</p>
        <RadioGroup legend="Default for new claims" name="default-claim" options={CLAIM_OPTIONS} value={claim} onChange={setClaim} disabled={busy} />
        <RadioGroup legend="Default for new watches" name="default-watch" options={WATCH_OPTIONS} value={watch} onChange={setWatch} disabled={busy} />
        <button type="button" onClick={saveDefaults} disabled={busy}>Save defaults</button>
        {message && (message.kind === "ok" ? <p role="status">{message.text}</p> : <p role="alert">{message.text}</p>)}
      </section>

      <section aria-labelledby="existing-h">
      <h2 id="existing-h">Change existing claims and watches</h2>
      <p>The buttons below change every claim or watch you already have. New ones still use your choices above.</p>
      <BulkSection
        title="Set all my existing claims to" noun="claims" options={CLAIM_OPTIONS} count={claimCount}
        labelOf={(v) => claimLevelLabel(v as ClaimVisibility)}
        apply={(v) => bulk("set_all_claim_visibility", { p_visibility: v })}
      />
      <BulkSection
        title="Set all my existing watches to" noun="watches" options={WATCH_OPTIONS} count={watchCount}
        labelOf={(v) => watchLevelLabel(v as WatchLevel)}
        apply={(v) => bulk("set_all_watch_named", { p_named: v === "named" })}
      />
      </section>
    </>
  );
}
