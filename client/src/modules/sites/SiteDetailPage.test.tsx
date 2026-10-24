import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockFetch, sentBody } from "../../test/mockFetch";
import { SiteDetailPage } from "./SiteDetailPage";
import type { Site, Weather } from "./types";

const mia = { id: 2, name: "Mia", email: "mia@example.com" };
const max = { id: 3, name: "Max", email: "max@example.com" };
const weather: Weather = {
  temperature: { value: 12.4, unit: "°C" },
  humidity: { value: 78, unit: "%" },
  precipitation: { value: 0.3, unit: "mm" },
  rain: { value: 0.2, unit: "mm" },
  snowfall: { value: 0.07, unit: "cm" },
  isDay: true,
};
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
  managers: [mia],
};

describe("SiteDetailPage", () => {
  it("shows the site's details and managers", async () => {
    mockFetch({ "GET /api/sites/7": { body: site } });
    render(<SiteDetailPage siteId={7} canEdit={false} onSignedOut={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Stuttgart Assembly" })).toBeInTheDocument();
    expect(screen.getByText("Stuttgart, Germany")).toBeInTheDocument();
    expect(screen.getByText("Main plant")).toBeInTheDocument();
    expect(screen.getByText(/48.7758, 9.1829/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view on map/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mlat=48.7758&mlon=9.1829"),
    );
    expect(screen.getByText("Mia")).toBeInTheDocument();
  });

  // Renders the page with the given weather and returns the weather panel once it has loaded.
  async function renderWithWeather(body: Weather) {
    mockFetch({ "GET /api/sites/7": { body: site }, "GET /api/sites/7/weather": { body } });
    render(<SiteDetailPage siteId={7} canEdit={false} onSignedOut={vi.fn()} />);
    const panel = await screen.findByRole("region", { name: "Current weather" });
    await within(panel).findByText("Humidity");
    return panel;
  }

  // The <dd> next to a <dt> label in the weather panel.
  const valueOf = (panel: HTMLElement, label: string) => within(panel).getByText(label).nextElementSibling;

  it("shows the current weather at the site in the units Open-Meteo reports", async () => {
    const panel = await renderWithWeather(weather);

    expect(within(panel).getByText("12°C")).toBeInTheDocument();
    expect(within(panel).getByText("Day")).toBeInTheDocument();
    expect(valueOf(panel, "Humidity")).toHaveTextContent("78%");
    expect(valueOf(panel, "Precipitation")).toHaveTextContent("0.3 mm");
    expect(valueOf(panel, "Rain")).toHaveTextContent("0.2 mm");
    expect(valueOf(panel, "Snowfall")).toHaveTextContent("0.07 cm");
  });

  it("uses whatever units the API returns", async () => {
    const panel = await renderWithWeather({
      ...weather,
      temperature: { value: 54.3, unit: "°F" },
      rain: { value: 0.01, unit: "inch" },
    });

    expect(within(panel).getByText("54°F")).toBeInTheDocument();
    expect(valueOf(panel, "Rain")).toHaveTextContent("0.01 inch");
  });

  it("shows Night when it is dark at the site", async () => {
    const panel = await renderWithWeather({ ...weather, isDay: false });

    expect(within(panel).getByText("Night")).toBeInTheDocument();
    expect(within(panel).queryByText("Day")).not.toBeInTheDocument();
  });

  it("shows a dash for missing values and still shows the rest", async () => {
    const panel = await renderWithWeather({ ...weather, temperature: null, rain: null, isDay: null });

    expect(valueOf(panel, "Rain")).toHaveTextContent("—");
    expect(valueOf(panel, "Humidity")).toHaveTextContent("78%");
    expect(within(panel).getAllByText("—")).toHaveLength(2);
    expect(within(panel).queryByText(/^(Day|Night)$/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stuttgart Assembly" })).toBeInTheDocument();
  });

  it("keeps the page working when the weather is unavailable", async () => {
    mockFetch({
      "GET /api/sites/7": { body: site },
      "GET /api/sites/7/weather": { status: 502, body: { error: "Weather is unavailable right now" } },
    });
    render(<SiteDetailPage siteId={7} canEdit={false} onSignedOut={vi.fn()} />);

    expect(await screen.findByText("Weather is unavailable right now.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stuttgart Assembly" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("is read-only for managers", async () => {
    mockFetch({ "GET /api/sites/7": { body: site } });
    render(<SiteDetailPage siteId={7} canEdit={false} onSignedOut={vi.fn()} />);

    await screen.findByRole("heading", { name: "Stuttgart Assembly" });
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign managers" })).not.toBeInTheDocument();
  });

  it("shows the error for a site that doesn't exist or isn't yours", async () => {
    mockFetch({ "GET /api/sites/7": { status: 404, body: { error: "Site not found" } } });
    render(<SiteDetailPage siteId={7} canEdit={false} onSignedOut={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Site not found");
  });

  it("lets a director assign managers", async () => {
    const fetch = mockFetch({
      "GET /api/sites/7": { body: site },
      "GET /api/managers": { body: [mia, max] },
      "PUT /api/sites/7/managers": { body: { ...site, managers: [max] } },
    });
    render(<SiteDetailPage siteId={7} canEdit onSignedOut={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Assign managers" }));
    const miaBox = await screen.findByRole("checkbox", { name: /mia/i });
    expect(miaBox).toBeChecked();
    await userEvent.click(miaBox);
    await userEvent.click(screen.getByRole("checkbox", { name: /max/i }));
    await userEvent.click(screen.getByRole("button", { name: "Save managers" }));

    expect(await screen.findByText("Max")).toBeInTheDocument();
    expect(screen.queryByText("Mia")).not.toBeInTheDocument();
    expect(sentBody(fetch, 3)).toEqual({ userIds: [3] });
  });

  it("deletes the site after confirming and returns to the list", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    const fetch = mockFetch({ "GET /api/sites/7": { body: site }, "DELETE /api/sites/7": { status: 204 } });
    render(<SiteDetailPage siteId={7} canEdit onSignedOut={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await vi.waitFor(() => expect(window.location.hash).toBe("#/sites"));
    expect(fetch).toHaveBeenCalledWith("/api/sites/7", expect.objectContaining({ method: "DELETE" }));
  });

  it("does nothing when the delete isn't confirmed", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    const fetch = mockFetch({ "GET /api/sites/7": { body: site } });
    render(<SiteDetailPage siteId={7} canEdit onSignedOut={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(fetch).not.toHaveBeenCalledWith("/api/sites/7", expect.objectContaining({ method: "DELETE" }));
  });
});
