import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockFetch } from "../test/mockFetch";
import { App } from "./App";

const dana = { id: 1, name: "Dana", email: "dana@example.com", role: "director" };
const mia = { id: 2, name: "Mia", email: "mia@example.com", role: "manager" };

function signedInAs(user: typeof dana) {
  return {
    "GET /api/auth/me": { body: user },
    "GET /api/items": { body: [] },
    "GET /api/sites": { body: [] },
    "GET /api/managers": { body: [] },
    "POST /api/auth/logout": { status: 204 },
  };
}

describe("App", () => {
  it("shows the sign-in page when there is no session", async () => {
    mockFetch({ "GET /api/auth/me": { status: 401, body: { error: "Not signed in" } } });
    render(<App />);

    expect(await screen.findByText("Sign in to your account")).toBeInTheDocument();
  });

  it("shows the dashboard with the user's name when signed in", async () => {
    mockFetch(signedInAs(dana));
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dana" })).toBeInTheDocument();
  });

  it("opens the Sites page from the dashboard card", async () => {
    mockFetch(signedInAs(dana));
    render(<App />);

    await userEvent.click(await screen.findByRole("link", { name: /^sites/i }));

    expect(await screen.findByRole("heading", { name: "Sites" })).toBeInTheDocument();
  });

  it("gives directors the Managers card and page", async () => {
    window.location.hash = "#/managers";
    mockFetch(signedInAs(dana));
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Managers" })).toBeInTheDocument();
  });

  it.each(["#/managers", "#/sites/new"])("sends a manager from director-only %s to the dashboard", async (hash) => {
    window.location.hash = hash;
    mockFetch(signedInAs(mia));
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /managers/i })).not.toBeInTheDocument();
  });

  it("opens the profile page from the URL", async () => {
    window.location.hash = "#/profile";
    mockFetch(signedInAs(dana));
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("dana@example.com")).toBeInTheDocument();
    expect(screen.getByText("director")).toBeInTheDocument();
  });

  it("returns to sign-in after logging out", async () => {
    mockFetch(signedInAs(dana));
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Dana" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(await screen.findByText("Sign in to your account")).toBeInTheDocument();
  });
});
