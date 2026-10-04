"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export default function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name });

      if (result.error) {
        setMessage(result.error.message ?? "Authentication failed.");
        return;
      }

      window.location.href = "/";
    } catch {
      setMessage("Unable to authenticate right now. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Link className="brand" href="/">TaskCash</Link>
        <span>NG</span>
      </div>

      <div className="auth-layout">
        <section className="auth-pitch">
          <p className="eyebrow">EARN • UNLOCK • WITHDRAW</p>
          <h1>Your spare time<br /><span>can pay.</span></h1>
          <p>Complete verified tasks, earn cash and build a balance you can actually use.</p>

          <div className="auth-proof">
            <div><strong>₦50</strong><span>test task live</span></div>
            <div><strong>1 tap</strong><span>to start earning</span></div>
            <div><strong>NG</strong><span>built for Nigeria</span></div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-head">
            <div>
              <p className="eyebrow">{mode === "sign-up" ? "GET STARTED" : "WELCOME BACK"}</p>
              <h2>{mode === "sign-up" ? "Create your account" : "Welcome back"}</h2>
            </div>
            <span className="secure-pill">SECURE</span>
          </div>

          <form onSubmit={submit} className="auth-form">
            {mode === "sign-up" && (
              <label>
                <span>Your name</span>
                <input required placeholder="e.g. Tomori" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            )}

            <label>
              <span>Email address</span>
              <input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label>
              <span>Password</span>
              <input required minLength={8} type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} placeholder="8 characters minimum" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>

            {message && <div className="auth-error" role="alert">{message}</div>}

            <button className="auth-submit" disabled={loading} type="submit">
              {loading ? "Working..." : mode === "sign-up" ? "Create free account" : "Sign in"}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="auth-switch">
            <span>{mode === "sign-up" ? "Already earning?" : "New to TaskCash?"}</span>
            <button type="button" onClick={() => { setMessage(""); setMode(mode === "sign-in" ? "sign-up" : "sign-in"); }}>
              {mode === "sign-up" ? "I already have an account" : "Create an account"}
            </button>
          </div>

          <p className="auth-note">By continuing, you agree to use TaskCash fairly and only complete tasks you are eligible for.</p>
        </section>
      </div>
    </main>
  );
}