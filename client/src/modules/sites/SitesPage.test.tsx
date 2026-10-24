import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockFetch } from "../../test/mockFetch";
import { SitesPage } from "./SitesPage";
import type { Site } from "./types";

const base = { description: "", created_at: "", updated_at: "", managers: [] };
const sites: Site[] = [
  {
    ...base,
    id: 1,
    name: "Stuttgart Assembly",
    city: "Stuttgart",
    country: "Germany",
    latitude: 48.8,
    longitude: 9.2,
    status: "active",
    managers: [{ id: 2, name: "Mia", email: "mia@example.com" }],
  },
  {
    ...base,
    id: 2,
    name: "Pune Components",
    city: "Pune",
    country: "India",
    latitude: 18.5,
    longitude: 73.9,
    status: "inactive",
  },
];

describe("SitesPage", () => {
  it("lists sites with location, status and managers, linking to each site", async () => {
    mockFetch({ "GET /api/sites": { body: sites } });
    render(<SitesPage canEdit onSignedOut={vi.fn()} />);

    const link = await screen.findByRole("link", { name: "Stuttgart Assembly" });
    expect(link).toHaveAttribute("href", "#/sites/1");
    const row = link.closest("tr")!;
    expect(row).toHaveTextContent("Stuttgart, Germany");
    expect(row).toHaveTextContent("active");
    expect(row).toHaveTextContent("Mia");
  });

  it("filters by search text and by status", async () => {
    mockFetch({ "GET /api/sites": { body: sites } });
    render(<SitesPage canEdit onSignedOut={vi.fn()} />);
    await screen.findByText("Pune Components");

    await userEvent.type(screen.getByLabelText("Search sites"), "india");
    expect(screen.queryByText("Stuttgart Assembly")).not.toBeInTheDocument();
    expect(screen.getByText("Pune Components")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Search sites"));
    await userEvent.selectOptions(screen.getByLabelText("Status"), "active");
    expect(screen.getByText("Stuttgart Assembly")).toBeInTheDocument();
    expect(screen.queryByText("Pune Components")).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "closed");
    expect(screen.getByText("No sites match the filters.")).toBeInTheDocument();
  });

  it("shows New site to directors only", async () => {
    mockFetch({ "GET /api/sites": { body: [] } });
    const { unmount } = render(<SitesPage canEdit onSignedOut={vi.fn()} />);
    expect(await screen.findByRole("link", { name: "New site" })).toBeInTheDocument();
    unmount();

    render(<SitesPage canEdit={false} onSignedOut={vi.fn()} />);
    expect(await screen.findByText("No sites yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New site" })).not.toBeInTheDocument();
  });

  it("signs the user out on 401", async () => {
    mockFetch({ "GET /api/sites": { status: 401, body: { error: "Not signed in" } } });
    const onSignedOut = vi.fn();
    render(<SitesPage canEdit onSignedOut={onSignedOut} />);

    await vi.waitFor(() => expect(onSignedOut).toHaveBeenCalled());
  });
});
