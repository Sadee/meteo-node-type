import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockFetch } from "../../test/mockFetch";
import { ItemsPage } from "./ItemsPage";

const pen = { id: 1, name: "Pen", created_at: "2026-01-01T00:00:00Z" };

describe("ItemsPage", () => {
  it("lists the items from the API", async () => {
    mockFetch({ "GET /api/items": { body: [pen] } });
    render(<ItemsPage onSignedOut={vi.fn()} />);

    expect(await screen.findByText("Pen")).toBeInTheDocument();
  });

  it("adds an item and clears the input", async () => {
    mockFetch({
      "GET /api/items": { body: [] },
      "POST /api/items": (body) => ({ status: 201, body: { ...pen, id: 2, ...(body as object) } }),
    });
    render(<ItemsPage onSignedOut={vi.fn()} />);

    const input = screen.getByPlaceholderText("New item");
    await userEvent.type(input, "Notebook");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Notebook")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("shows the API error message", async () => {
    mockFetch({
      "GET /api/items": { body: [] },
      "POST /api/items": { status: 400, body: { error: "name is required" } },
    });
    render(<ItemsPage onSignedOut={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("name is required")).toBeInTheDocument();
  });

  it("signs the user out when the session has expired (401)", async () => {
    mockFetch({ "GET /api/items": { status: 401, body: { error: "Not signed in" } } });
    const onSignedOut = vi.fn();
    render(<ItemsPage onSignedOut={onSignedOut} />);

    await vi.waitFor(() => expect(onSignedOut).toHaveBeenCalled());
  });
});
