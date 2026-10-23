import { useEffect, useState } from "react";
import { api, type User } from "./api";
import { AuthPage } from "./AuthPage";
import { ItemsPage } from "./ItemsPage";

export function App() {
  // undefined while checking for an existing session, null when signed out.
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) return null;
  if (user === null) return <AuthPage onAuthenticated={setUser} />;
  return <ItemsPage user={user} onSignedOut={() => setUser(null)} />;
}
