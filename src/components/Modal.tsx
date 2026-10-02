"use client";
import { useEffect, useId, useRef } from "react";

const FOCUSABLE = 'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled])';

/** Accessible modal: labelled dialog, focus trap, Escape closes, focus returns to the opener. */
export default function Modal({
  title, onClose, busy = false, children,
}: { title: string; onClose: () => void; busy?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus?.();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!busy) onClose();
      return;
    }
    if (e.key === "Tab") {
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  return (
    <div className="modal-backdrop">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="modal"
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
