import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockFetch, sentBody } from "../../test/mockFetch";
import { ManagersPage } from "./ManagersPage";

const mia = { id: 2, name: "Mia", email: "mia@example.com", created_at: "2026-01-01T00:00:00Z", site_count: 2 };

describe("ManagersPage", () => {
  it("lists managers with their site count", async () => {
    mockFetch({ "GET /api/managers": { body: [mia] } });
    render(<ManagersPage onSignedOut={vi.fn()} />);

    const row = (await screen.findByText("Mia")).closest("tr")!;
    expect(row).toHaveTextContent("mia@example.com");
    expect(row).toHaveTextContent("2");
  });

  it("creates a manager and clears the form", async () => {
    const fetch = mockFetch({
      "GET /api/managers": { body: [] },
      "POST /api/managers": { status: 201, body: { ...mia, site_count: 0 } },
    });
    render(<ManagersPage onSignedOut={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Name"), "Mia");
    await userEvent.type(screen.getByLabelText("Email"), "mia@example.com");
    await userEvent.type(screen.getByLabelText(/initial password/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Add manager" }));

    expect(await screen.findByText("mia@example.com")).toBeInTheDocument();
    expect(sentBody(fetch, 1)).toEqual({ name: "Mia", email: "mia@example.com", password: "password123" });
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("shows the API error", async () => {
    mockFetch({
      "GET /api/managers": { body: [] },
      "POST /api/managers": { status: 409, body: { error: "An account with this email already exists" } },
    });
    render(<ManagersPage onSignedOut={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Name"), "Mia");
    await userEvent.type(screen.getByLabelText("Email"), "mia@example.com");
    await userEvent.type(screen.getByLabelText(/initial password/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Add manager" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
  });

  it("signs the user out on 401", async () => {
    mockFetch({ "GET /api/managers": { status: 401, body: { error: "Not signed in" } } });
    const onSignedOut = vi.fn();
    render(<ManagersPage onSignedOut={onSignedOut} />);

    await vi.waitFor(() => expect(onSignedOut).toHaveBeenCalled());
  });
});
