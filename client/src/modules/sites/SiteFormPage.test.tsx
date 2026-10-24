import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockFetch, sentBody } from "../../test/mockFetch";
import { SiteFormPage } from "./SiteFormPage";
import type { Site } from "./types";

const site: Site = {
  id: 7,
  name: "Stuttgart Assembly",
  description: "Main plant",
  city: "Stuttgart",
  country: "Germany",
  latitude: 48.7758,
  longitude: 9.1829,
  status: "active",
  created_at: "",
  updated_at: "",
  managers: [],
};

async function fillIn(label: string | RegExp, value: string) {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

describe("SiteFormPage", () => {
  it("creates a site with numeric coordinates and opens it", async () => {
    const fetch = mockFetch({ "POST /api/sites": { status: 201, body: site } });
    render(<SiteFormPage onSignedOut={vi.fn()} />);

    await fillIn("Name", "Stuttgart Assembly");
    await fillIn("Description", "Main plant");
    await fillIn("City", "Stuttgart");
    await fillIn("Country", "Germany");
    await fillIn("Latitude", "48.7758");
    await fillIn("Longitude", "9.1829");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "active");
    await userEvent.click(screen.getByRole("button", { name: "Create site" }));

    await vi.waitFor(() => expect(window.location.hash).toBe("#/sites/7"));
    expect(sentBody(fetch)).toEqual({
      name: "Stuttgart Assembly",
      description: "Main plant",
      city: "Stuttgart",
      country: "Germany",
      latitude: 48.7758,
      longitude: 9.1829,
      status: "active",
    });
  });

  it("loads an existing site and saves changes", async () => {
    const fetch = mockFetch({
      "GET /api/sites/7": { body: site },
      "PUT /api/sites/7": (body) => ({ body: { ...site, ...(body as object) } }),
    });
    render(<SiteFormPage siteId={7} onSignedOut={vi.fn()} />);

    expect(await screen.findByLabelText("Name")).toHaveValue("Stuttgart Assembly");
    expect(screen.getByLabelText("Latitude")).toHaveValue(48.7758);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "closed");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() => expect(window.location.hash).toBe("#/sites/7"));
    expect(sentBody(fetch, 1)).toMatchObject({ status: "closed", latitude: 48.7758 });
  });

  it("shows the API error and stays on the form", async () => {
    mockFetch({ "POST /api/sites": { status: 400, body: { error: "Latitude must be a number between -90 and 90" } } });
    render(<SiteFormPage onSignedOut={vi.fn()} />);

    await fillIn("Name", "X");
    await fillIn("City", "Y");
    await fillIn("Country", "Z");
    await fillIn("Latitude", "1");
    await fillIn("Longitude", "1");
    await userEvent.click(screen.getByRole("button", { name: "Create site" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Latitude must be");
    expect(screen.getByRole("button", { name: "Create site" })).toBeEnabled();
  });
});
