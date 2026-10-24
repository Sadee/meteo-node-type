import { FormEvent, useEffect, useState } from "react";
import { isUnauthorized } from "../../shared/api";
import { managersApi } from "./api";
import type { Manager } from "./types";
import "./user.css";

type Props = { onSignedOut: () => void };

// Directors only: list managers and create their accounts (there is no self-registration).
export function ManagersPage({ onSignedOut }: Props) {
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleError(err: unknown) {
    if (isUnauthorized(err)) onSignedOut();
    else setError((err as Error).message);
  }

  useEffect(() => {
    managersApi.list().then(setManagers).catch(handleError);
    // Load once on mount. handleError is recreated every render, so listing it would refetch each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addManager(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const manager = await managersApi.create({ name, email, password });
      setManagers((prev) => [...(prev ?? []), manager].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <a href="#/" className="back">
        ← Dashboard
      </a>
      <h1>Managers</h1>
      <p className="muted">Create manager accounts, then assign them to sites from a site's page.</p>

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Sites</th>
            </tr>
          </thead>
          <tbody>
            {managers?.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td>{m.site_count}</td>
              </tr>
            ))}
            {managers?.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  No managers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Add a manager</h2>
      <form className="panel form" onSubmit={addManager}>
        <div className="row">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </div>
        <label>
          Initial password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
          <span className="hint">At least 8 characters. Share it with the manager securely.</span>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Adding…" : "Add manager"}
          </button>
        </div>
      </form>
    </>
  );
}
