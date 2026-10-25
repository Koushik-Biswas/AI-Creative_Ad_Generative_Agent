"use client";
import { useState } from "react";
import { ArrowUpRight, LockKeyhole, Loader2, Sparkles } from "lucide-react";
export default function Login() {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sign-in failed");
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand">
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          <span>
            signal<span className="brand-light">studio</span>
          </span>
        </div>
        <div>
          <span className="hero-eyebrow">
            <Sparkles size={15} />
            INSIGHT MEETS IMAGINATION
          </span>
          <h1>
            Great ads start
            <br />
            with a <em>signal.</em>
          </h1>
          <p>
            Know your business. Read the market.
            <br />
            Create something unmistakably yours.
          </p>
        </div>
        <small>B2B CREATIVE INTELLIGENCE · YOUR PRIVATE WORKSPACE</small>
      </section>
      <section className="login-form-wrap">
        <form onSubmit={submit} className="login-form">
          <span className="empty-icon">
            <LockKeyhole size={25} />
          </span>
          <span className="eyebrow">WELCOME TO YOUR STUDIO</span>
          <h2>A fresh perspective awaits.</h2>
          <p>Enter the workspace password you configured during deployment.</p>
          <label className="field">
            <span>Workspace password</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              maxLength={256}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? <Loader2 size={17} className="spin" /> : null}Open your
            workspace <ArrowUpRight size={17} />
          </button>
          <small>
            First setup? Follow START_HERE.md and DEPLOYMENT.md.
            <br />
            Passwords and API keys are configured in server environment
            variables.
          </small>
        </form>
      </section>
    </main>
  );
}
