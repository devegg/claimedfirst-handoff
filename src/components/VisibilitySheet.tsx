"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CLAIM_OPTIONS, WATCH_OPTIONS, type SheetOption } from "@/lib/visibility";
import HelpTip from "./HelpTip";

export type VisibilitySheetProps = {
  mode: "claim" | "watch";
  artistName: string;
  initialValue: string;
  confirmLabel: string;
  onConfirm: (value: string) => Promise<void>;
  onClose: () => void;
  /** Overrides the default "Claim [artist]" / "Watch [artist]" title, for editing an existing item. */
  title?: string;
};

const FOCUSABLE = 'a[href], input:not([disabled]), button:not([disabled])';

export default function VisibilitySheet({
  mode, artistName, initialValue, confirmLabel, onConfirm, onClose, title,
}: VisibilitySheetProps) {
  const options: SheetOption<string>[] = mode === "claim" ? CLAIM_OPTIONS : WATCH_OPTIONS;
  const [value, setValue] = useState(options.some((o) => o.value === initialValue) ? initialValue : options[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const noteId = `${uid}-note`;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("input:checked")?.focus();
    return () => opener?.focus?.();
  }, []);

  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(value);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Try again.");
      submitting.current = false;
      setBusy(false);
      return;
    }
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!busy) onClose();
      return;
    }
    if (e.key === "Tab") {
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  const heading = title ?? `${mode === "claim" ? "Claim" : "Watch"} ${artistName}`;
  const note = mode === "claim"
    ? "Your number is permanent. Who sees your name is your choice, and you can change it later."
    : "No number, no slot. The public never sees who is watching. Choose whether the artist can.";

  return (
    <div className="modal-backdrop">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        onKeyDown={onKeyDown}
        className="modal"
      >
        <h2 id={titleId}>{heading}</h2>
        <p id={noteId}>{note}</p>
        <div role="radiogroup" aria-labelledby={titleId}>
          {options.map((o) => (
            <div key={o.value} className="option">
              <input
                type="radio"
                name={`${uid}-visibility`}
                id={`${uid}-${o.value}`}
                value={o.value}
                checked={value === o.value}
                disabled={busy}
                onChange={() => setValue(o.value)}
                aria-labelledby={`${uid}-${o.value}-label`}
                aria-describedby={o.description ? `${uid}-${o.value}-desc` : undefined}
              />
              <div>
                <label id={`${uid}-${o.value}-label`} htmlFor={`${uid}-${o.value}`}><strong>{o.label}</strong></label>
                {o.description && <div id={`${uid}-${o.value}-desc`} className="option-desc">{o.description}</div>}
                {mode === "claim" && o.value === "anonymous" && <HelpTip id="anonymous-scout" />}
              </div>
            </div>
          ))}
        </div>
        <p>Who sees your name? <HelpTip id="privacy" newTab /></p>
        {mode === "claim" && <p>You keep your number, your points and your slot either way.</p>}
        {error && <p role="alert">{error}</p>}
        <div className="btn-row">
          <button type="button" className="btn-primary" onClick={confirm} disabled={busy}>{confirmLabel}</button>
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
