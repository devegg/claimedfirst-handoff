"use client";
import { useEffect, useRef } from "react";
import type { GuideId } from "@/lib/guide";

/**
 * Small "i" control that opens a short explanation as a popover below it, so opening never moves the layout.
 * Built on details/summary so the text is reachable without JavaScript; the script adds closing on Escape and on an
 * outside click, and keeps the popover inside the screen. No focus trap. `guide` adds a link to the Guide entry.
 * Do not place it inside a <p>: details is block content.
 */
export default function InfoTip({ text, label = "Why?", guide }: { text: string; label?: string; guide?: GuideId }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && el?.open) { el.open = false; el.querySelector("summary")?.focus(); }
    }
    function onClick(e: MouseEvent) {
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) el.open = false;
    }
    function onToggle() {
      const t = el?.querySelector<HTMLElement>(".info-tip-text");
      if (!el?.open || !t) return;
      t.style.left = "0px";
      const r = t.getBoundingClientRect();
      const margin = 12;
      let shift = 0;
      if (r.right > document.documentElement.clientWidth - margin) shift = document.documentElement.clientWidth - margin - r.right;
      if (r.left + shift < margin) shift = margin - r.left;
      t.style.left = `${shift}px`;
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    el.addEventListener("toggle", onToggle);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); el.removeEventListener("toggle", onToggle); };
  }, []);

  return (
    <details ref={ref} className="info-tip">
      <summary aria-label={label}><span aria-hidden="true">i</span></summary>
      <span role="status" className="info-tip-text">
        {text}
        {guide && <> <a href={`/guide#${guide}`}>More in the Guide</a></>}
      </span>
    </details>
  );
}
