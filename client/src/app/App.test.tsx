import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockFetch } from "../test/mockFetch";
import { App } from "./App";

const ada = { id: 1, name: "Ada", email: "ada@example.com" };
const signedIn = {
  "GET /api/auth/me": { body: ada },
  "GET /api/items": { body: [] },
  "POST /api/auth/logout": { status: 204 },
};

describe("App", () => {
  it("shows the sign-in page when there is no session", async () => {
    mockFetch({ "GET /api/auth/me": { status: 401, body: { error: "Not signed in" } } });
    render(<App />);

    expect(await screen.findByText("Sign in to your account")).toBeInTheDocument();
  });

  it("shows the dashboard with the user's name when signed in", async () => {
    mockFetch(signedIn);
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ada" })).toBeInTheDocument();
  });

  it("opens the Items page from the dashboard card", async () => {
    mockFetch(signedIn);
    render(<App />);

    await userEvent.click(await screen.findByRole("link", { name: /items/i }));

    expect(await screen.findByRole("heading", { name: "Items" })).toBeInTheDocument();
  });

  it("opens the profile page from the URL", async () => {
    window.location.hash = "#/profile";
    mockFetch(signedIn);
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("returns to sign-in after logging out", async () => {
    mockFetch(signedIn);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Ada" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(await screen.findByText("Sign in to your account")).toBeInTheDocument();
  });
});
