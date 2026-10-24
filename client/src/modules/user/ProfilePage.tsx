import type { User } from "./types";
import "./user.css";

export function ProfilePage({ user }: { user: User }) {
  return (
    <>
      <a href="#/" className="back">
        ← Dashboard
      </a>
      <h1>Profile</h1>
      <dl className="panel profile">
        <dt>Name</dt>
        <dd>{user.name}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
      </dl>
    </>
  );
}
