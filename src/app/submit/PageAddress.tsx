"use client";
import { useEffect, useRef, useState } from "react";
import { canonicalArtistKey, SLUG_RE } from "@/lib/artist-url";
import type { AddressCheck, AddressState } from "@/app/api/submit-check/route";

type Props = { url: string; onState?: (s: AddressState | "idle") => void };

function derive(url: string) {
  try { return canonicalArtistKey(url).slug; } catch { return null; }
}

export default function PageAddress({ url, onState }: Props) {
  const derived = derive(url);
  // The user's own edit applies to the link it was typed for; pasting a different link re-derives the address.
  const [typed, setTyped] = useState<{ url: string; value: string } | null>(null);
  const slug = (typed?.url === url ? typed.value : null) ?? derived ?? "";
  // Each result remembers the link and address it answered; it is shown only while they still match the input.
  const [check, setCheck] = useState<(Omit<AddressCheck, "state"> & { state: AddressState | "busy"; url: string; slug: string }) | null>(null);
  const onStateRef = useRef(onState);
  useEffect(() => { onStateRef.current = onState; });

  useEffect(() => {
    if (derived === null) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/submit-check?${new URLSearchParams({ url, slug })}`, { signal: ctl.signal });
        if (r.status === 429) { setCheck({ url, slug, state: "busy", matches: [] }); return; }
        if (!r.ok) throw new Error("check_failed");
        setCheck({ ...((await r.json()) as AddressCheck), url, slug });
      } catch { /* aborted or offline: the server re-checks on submit */ }
    }, 350);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [url, slug, derived]);

  const badFormat = !SLUG_RE.test(slug);
  const current = check && check.url === url && check.slug === slug ? check : null;
  const status: AddressState | "idle" | "checking" | "busy" = derived === null ? "idle" : badFormat ? "invalid_slug" : current ? current.state : "checking";
  useEffect(() => { onStateRef.current?.(status === "checking" || status === "busy" ? "idle" : status); }, [status]);

  if (derived === null) return null;
  const state = status;
  return (
    <div className="page-address">
      <label htmlFor="slug">Page address</label>
      <div className="field-row">
        <span id="slug-prefix" className="muted">claimedfirst.com/artist/</span>
        <input id="slug" name="slug" value={slug} maxLength={30} autoComplete="off" spellCheck={false}
          onChange={(e) => setTyped({ url, value: e.target.value.toLowerCase() })} aria-describedby="slug-prefix slug-status" />
      </div>
      <div id="slug-status" role="status" data-testid="slug-status">
        {badFormat ? (
          <p>Use 2-30 characters: letters, numbers, - or _, starting with a letter or number.</p>
        ) : state === "listed" ? (
          <p>
            This link is already listed
            {current?.existing && <> as <a href={`/artist/${current.existing.slug}`}>{current.existing.name}</a></>}. Submitting adds you as a submitter.
          </p>
        ) : state === "taken" ? (
          <p>
            That address is taken by another artist{current?.existing && <> (<a href={`/artist/${current.existing.slug}`}>{current.existing.name}</a>)</>}. Edit the address above to choose another.
          </p>
        ) : state === "checking" ? (
          <p>Checking...</p>
        ) : state === "busy" ? (
          <p>Too many checks. Try again in a moment.</p>
        ) : state === "available" ? (
          <p>claimedfirst.com/artist/{slug} is available.</p>
        ) : null}
      </div>
      {current && current.matches.length > 0 && (
        <div data-testid="slug-matches">
          <p className="muted">Existing artists</p>
          <ul>
            {current.matches.map((m) => (
              <li key={m.slug}><a href={`/artist/${m.slug}`}>{m.name}</a> <span className="muted">/artist/{m.slug}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
