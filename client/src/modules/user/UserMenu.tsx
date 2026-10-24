import { useEffect, useRef, useState } from "react";
import type { User } from "./types";
import "./user.css";

export function UserMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-toggle" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar" aria-hidden="true">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="user-name">{user.name}</span>
        <span className="caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="dropdown" role="menu">
          <a href="#/profile" role="menuitem" onClick={() => setOpen(false)}>
            Profile
          </a>
          <button role="menuitem" onClick={onSignOut}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
