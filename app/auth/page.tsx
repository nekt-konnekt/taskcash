"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export default function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
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
        setMessage(result.error.message);
        return;
      }

      window.location.href = "/";
    } catch {
      setMessage("Unable to authenticate right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h1>{mode === "sign-in" ? "Sign in to TaskCash" : "Create your TaskCash account"}</h1>

      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {mode === "sign-up" && (
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}

        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          required
          minLength={8}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button disabled={loading} type="submit">
          {loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      {message && <p role="alert">{message}</p>}

      <button
        type="button"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        style={{ marginTop: 16 }}
      >
        {mode === "sign-in" ? "Create an account" : "I already have an account"}
      </button>
    </main>
  );
}
