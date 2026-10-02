"use client";
import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { verifyMessage } from "@/lib/verify-messages";

type LinkItem = { id: string; platform: string; url: string };

export default function VerifyPanel({ artistId, artistName }: { artistId: string; artistName: string }) {
  const router = useRouter();
  const uid = useId();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [linkId, setLinkId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // The session is only used to read the access token for the Authorization header.
  // The server re-checks the token; nothing here is trusted for authorization.
  const token = useCallback(async () => {
    const { data } = await createClient().auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  // Reads the caller's current code. The server makes a new one when the old one is 24 hours old or already used.
  const loadCode = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const t = await token();
      if (!t) { if (!isCancelled()) setLoadError(verifyMessage("unauthorized")); return false; }
      const res = await fetch(`/api/verify?artistId=${encodeURIComponent(artistId)}`, { headers: { Authorization: `Bearer ${t}` } });
      const body = await res.json();
      if (isCancelled()) return false;
      if (!res.ok || typeof body.code !== "string") { setLoadError(verifyMessage(body?.reason)); return false; }
      setLoadError(null);
      setCode(body.code);
      const exp = typeof body.expiresAt === "string" && !Number.isNaN(Date.parse(body.expiresAt)) ? body.expiresAt : null;
      setExpiresAt(exp);
      setExpired(exp !== null && Date.parse(exp) <= Date.now());
      setCopied(false);
      const ls = Array.isArray(body.links) ? (body.links as LinkItem[]) : [];
      setLinks(ls);
      setLinkId((cur) => (ls.some((l) => l.id === cur) ? cur : ls[0]?.id ?? ""));
      return true;
    } catch {
      if (!isCancelled()) setLoadError(verifyMessage(null));
      return false;
    }
  }, [artistId, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => { await loadCode(() => cancelled); })();
    return () => { cancelled = true; };
  }, [loadCode]);

  // Flip to the expired state when the time passes while the page is open.
  useEffect(() => {
    if (!expiresAt) return;
    const ms = Date.parse(expiresAt) - Date.now();
    if (ms <= 0) return; // loadCode already marked it expired
    const t = setTimeout(() => setExpired(true), Math.min(ms, 2_000_000_000));
    return () => clearTimeout(t);
  }, [expiresAt]);

  async function check() {
    if (busy || !linkId) return;
    setBusy(true); setResult(null);
    try {
      const t = await token();
      if (!t) { setResult({ ok: false, text: verifyMessage("unauthorized") }); return; }
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, linkId }),
      });
      const body = await res.json().catch(() => null);
      const ok = body?.ok === true && body?.reason === "found";
      if (body?.reason === "code_expired" || body?.reason === "code_used") {
        await loadCode(); // show the new code the server just made
      }
      setResult({ ok, text: verifyMessage(body?.reason) });
      if (ok) router.refresh();
    } catch {
      setResult({ ok: false, text: verifyMessage(null) });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <section aria-labelledby={`${uid}-h`} className="panel">
      <h2 id={`${uid}-h`}>Verify this page</h2>
      <p>Are you {artistName}? Prove it and this page becomes yours.</p>
      <ol>
        <li>Copy your code below.</li>
        <li>Paste it into your bio on one of the pages listed here, and save.</li>
        <li>Pick that page and press Check now.</li>
      </ol>
      {loadError && <p role="alert">{loadError}</p>}
      {code && (
        <>
          <p>
            Your code: <code className="code-chip">{code}</code>{" "}
            <button type="button" onClick={copy}>Copy code</button>{" "}
            {copied && <small role="status">Copied.</small>}
          </p>
          {expiresAt && (
            <p>
              <small>{expired ? "This code has expired." : `Expires ${new Date(expiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} (your local time)`}</small>{" "}
              {expired && <button type="button" onClick={() => { setResult(null); void loadCode(); }}>Get a new code</button>}
            </p>
          )}
          <p>
            <label htmlFor={`${uid}-l`}>Page to check</label>{" "}
            <select id={`${uid}-l`} value={linkId} onChange={(e) => setLinkId(e.target.value)} disabled={busy}>
              {links.map((l) => <option key={l.id} value={l.id}>{l.platform} - {l.url}</option>)}
            </select>{" "}
            <button type="button" onClick={check} disabled={busy || !linkId}>Check now</button>
          </p>
          {result && <p role="status">{result.text}</p>}
          <p><small>A code works for 24 hours, and only once.</small></p>
          <p><small>
            Some pages only show their bio in a browser, so we may not be able to read them. If your page needs a
            browser to display, it may not be readable here: add the code to another page you listed and check again.
          </small></p>
        </>
      )}
    </section>
  );
}
