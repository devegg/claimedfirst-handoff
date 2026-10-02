"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const oauthEnabled = process.env.NEXT_PUBLIC_OAUTH_ENABLED === "true";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "Could not send the link. Try again." : "Check your email for the sign-in link.");
  }
  async function oauth(provider: "google" | "apple") {
    await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="narrow">
      <div className="panel panel-narrow">
        <h1>Sign in or create your account</h1>
        <p>We will email you a secure sign-in link. No password needed.</p>
        <form onSubmit={sendLink}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="field-block" />
          <button type="submit">Email me a sign-in link</button>
        </form>
        {status && <p role="status">{status}</p>}
        {oauthEnabled && (
          <>
            <hr />
            {(["google", "apple"] as const).map((p) => (
              <div key={p} className="stack-row">
                <button type="button" onClick={() => oauth(p)}>
                  Continue with {p === "google" ? "Google" : "Apple"}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
