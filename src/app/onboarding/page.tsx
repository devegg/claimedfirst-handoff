"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { isValidHandle, isValidRefCode, REF_COOKIE } from "@/lib/handle";

function readRef(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
  const v = m ? decodeURIComponent(m[1]) : "";
  return isValidRefCode(v) ? v : null;
}
const MESSAGES: Record<string, string> = {
  handle_taken: "That handle is taken.",
  invalid_handle: "Handles are 3-20 characters: a-z, 0-9, underscore.",
  profile_exists: "You already have a profile.",
  not_authenticated: "Please sign in first.",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidHandle(handle)) return;
    let stale = false;
    const t = setTimeout(async () => {
      const { data } = await createClient().from("public_profiles").select("id").eq("handle", handle).maybeSingle();
      if (!stale) setAvailable(!data);
    }, 300);
    return () => { stale = true; clearTimeout(t); };
  }, [handle]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: err } = await createClient().rpc("create_profile", { p_handle: handle, p_ref: readRef() });
    if (err) {
      const key = Object.keys(MESSAGES).find((k) => err.message.includes(k));
      setError(key ? MESSAGES[key] : "Something went wrong.");
      return;
    }
    router.push("/");
  }

  const valid = isValidHandle(handle);
  return (
    <main className="narrow">
      <div className="panel panel-narrow">
        <h1>Pick your handle</h1>
        <form onSubmit={submit}>
          <input aria-label="Handle" value={handle} onChange={(e) => { setAvailable(null); setHandle(e.target.value.toLowerCase()); }}
            autoComplete="off" className="field-block" />
          <p role="status">
            {handle && !valid && "Not a valid handle (3-20 characters: a-z, 0-9, underscore; some words are reserved)."}
            {valid && available === null && "Checking..."}
            {valid && available === true && "Available."}
            {valid && available === false && "Taken."}
          </p>
          <button type="submit" disabled={!valid || available !== true}>Create profile</button>
        </form>
        {error && <p role="alert">{error}</p>}
      </div>
    </main>
  );
}
