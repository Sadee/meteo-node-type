import { ReactNode } from "react";
import { UserMenu, type User } from "../modules/user";
import "./app.css";

type Props = { user: User; onSignOut: () => void; children: ReactNode };

export function Layout({ user, onSignOut, children }: Props) {
  return (
    <div className="layout">
      <header className="topbar">
        <a href="#/" className="brand">
          <img src="/logo.svg" alt="" width={32} height={32} />
          <span>Meteo Node Type</span>
        </a>
        <UserMenu user={user} onSignOut={onSignOut} />
      </header>
      <main className="content">{children}</main>
      <footer className="footer">© {new Date().getFullYear()} Meteo Node Type Demo</footer>
    </div>
  );
}
