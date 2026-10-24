import { useEffect, useState } from "react";
import { ItemsPage } from "../modules/items";
import { AuthPage, ProfilePage, userApi, type User } from "../modules/user";
import { Dashboard } from "./Dashboard";
import { Layout } from "./Layout";

// Minimal hash routing (#/, #/items, #/profile) so links and the back button work without a router package.
function useRoute() {
  const read = () => window.location.hash.replace(/^#/, "") || "/";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function App() {
  // undefined while checking for an existing session, null when signed out.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const route = useRoute();

  useEffect(() => {
    userApi
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  function signedOut() {
    window.location.hash = "";
    setUser(null);
  }

  async function signOut() {
    await userApi.logout().catch(() => {});
    signedOut();
  }

  if (user === undefined) return null;
  if (user === null) return <AuthPage onAuthenticated={setUser} />;

  let page;
  if (route === "/items") page = <ItemsPage onSignedOut={signedOut} />;
  else if (route === "/profile") page = <ProfilePage user={user} />;
  else page = <Dashboard />;

  return (
    <Layout user={user} onSignOut={signOut}>
      {page}
    </Layout>
  );
}
