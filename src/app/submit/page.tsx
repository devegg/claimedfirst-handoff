"use client";
import { use, useActionState, useState } from "react";
import { submitArtist, type SubmitState } from "./actions";
import PageAddress from "./PageAddress";

export default function SubmitPage({ searchParams }: { searchParams?: Promise<{ name?: string | string[]; url?: string | string[] }> } = {}) {
  const sp = searchParams ? use(searchParams) : {};
  const prefill = (Array.isArray(sp.name) ? sp.name[0] : sp.name)?.slice(0, 80) ?? "";
  const rawUrl = (Array.isArray(sp.url) ? sp.url[0] : sp.url)?.slice(0, 300) ?? "";
  const urlPrefill = rawUrl.startsWith("https://") ? rawUrl : "";
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitArtist, null);
  const [url, setUrl] = useState(urlPrefill);
  const [name, setName] = useState(prefill); // controlled so a failed submit (for example a taken address) keeps what was typed
  const [addr, setAddr] = useState<string>("idle");
  const [seen, setSeen] = useState<SubmitState>(null);
  if (state?.pending && state !== seen) { setSeen(state); setUrl(""); setName(""); } // clear the form after a successful submit
  const blocked = addr === "taken" || addr === "invalid_slug";
  return (
    <main className="narrow">
      <div className="page-head">
        <p className="eyebrow">Scout</p>
        <h1>Add an artist</h1>
        <p className="lede">Anyone can add an artist. Paste a link to the artist&apos;s public page.</p>
        <p>Suno profile, YouTube channel, or the artist&apos;s own website.</p>
        <p>A page waits on Discover, under Needs scouts, until 3 different Scouts have added it.</p>
      </div>
      <form action={action} className="panel form-stack">
        <label htmlFor="url">Artist link</label>
        <input id="url" name="url" required placeholder="https://suno.com/@name" value={url} onChange={(e) => setUrl(e.target.value)} />
        <PageAddress url={url} onState={setAddr} />
        <label htmlFor="name">Artist name</label>
        <input id="name" name="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={pending || blocked}>Submit</button>
      </form>
      {state?.error && <p role="alert">{state.error}</p>}
      {state?.pending && (
        <p role="status" className="notice">
          Thanks. {state.pending.name} has been added. This page goes live when 3 scouts have added it.
        </p>
      )}
    </main>
  );
}
