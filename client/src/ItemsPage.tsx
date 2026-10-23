import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, type Item, type User } from "./api";

type Props = { user: User; onSignedOut: () => void };

export function ItemsPage({ user, onSignedOut }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleError(err: unknown) {
    // A 401 means the session expired or was cleared; send the user back to sign in.
    if (err instanceof ApiError && err.status === 401) onSignedOut();
    else setError((err as Error).message);
  }

  useEffect(() => {
    api<Item[]>("/items").then(setItems).catch(handleError);
  }, []);

  async function addItem(e: FormEvent) {
    e.preventDefault();
    try {
      const item = await api<Item>("/items", { method: "POST", body: { name } });
      setItems((prev) => [...prev, item]);
      setName("");
      setError(null);
    } catch (err) {
      handleError(err);
    }
  }

  async function signOut() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    onSignedOut();
  }

  return (
    <main className="page">
      <header>
        <h1>Meteo Node Type Demo</h1>
        <div className="user">
          <span>{user.name}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <form className="inline" onSubmit={addItem}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New item" />
        <button type="submit" className="primary">
          Add
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="items">
        {items.map((i) => (
          <li key={i.id}>{i.name}</li>
        ))}
      </ul>
    </main>
  );
}
