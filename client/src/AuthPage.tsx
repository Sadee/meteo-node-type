import { FormEvent, useState } from "react";
import { api, type User } from "./api";

type Mode = "login" | "register";

export function AuthPage({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = mode === "login" ? { email, password } : { name, email, password };
      onAuthenticated(await api<User>(`/auth/${mode}`, { method: "POST", body }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <main className="auth">
      <div className="card">
        <h1>Meteo Node Type Demo</h1>
        <p className="muted">{isLogin ? "Sign in to your account" : "Create a new account"}</p>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={isLogin} onClick={() => switchMode("login")}>
            Sign in
          </button>
          <button role="tab" aria-selected={!isLogin} onClick={() => switchMode("register")}>
            Register
          </button>
        </div>

        <form onSubmit={submit}>
          {!isLogin && (
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          )}
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
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={isLogin ? undefined : 8}
              maxLength={72}
              required
            />
            {!isLogin && <span className="hint">At least 8 characters</span>}
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
