import { FormEvent, useState } from "react";
import { userApi } from "./api";
import type { User } from "./types";
import "./user.css";

// Sign-in only: accounts are created by a director on the Managers page.
export function AuthPage({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onAuthenticated(await userApi.login({ email, password }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <div className="card">
        <h1>Meteo Node Type Demo</h1>
        <p className="muted">Sign in to your account</p>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Please wait…" : "Sign in"}
          </button>
        </form>
        <p className="hint">No account? Ask a director to create one for you.</p>
      </div>
    </main>
  );
}
