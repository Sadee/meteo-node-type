import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../shared/api";
import { itemsApi } from "./api";
import type { Item } from "./types";
import "./items.css";

type Props = { onSignedOut: () => void };

export function ItemsPage({ onSignedOut }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleError(err: unknown) {
    // A 401 means the session expired or was cleared; send the user back to sign in.
    if (err instanceof ApiError && err.status === 401) onSignedOut();
    else setError((err as Error).message);
  }

  useEffect(() => {
    itemsApi.list().then(setItems).catch(handleError);
    // Load once on mount. handleError is recreated every render, so listing it would refetch each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addItem(e: FormEvent) {
    e.preventDefault();
    try {
      const item = await itemsApi.create({ name });
      setItems((prev) => [...prev, item]);
      setName("");
      setError(null);
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <>
      <a href="#/" className="back">
        ← Dashboard
      </a>
      <h1>Items</h1>
      <p className="muted">Add an item and it will appear in the list below.</p>

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
    </>
  );
}
