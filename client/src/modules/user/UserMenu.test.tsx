import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "./UserMenu";

const ada = { id: 1, name: "Ada", email: "ada@example.com" };

function openMenu(onSignOut = vi.fn()) {
  render(
    <>
      <UserMenu user={ada} onSignOut={onSignOut} />
      <p>Elsewhere</p>
    </>,
  );
  return userEvent.click(screen.getByRole("button", { name: "Ada" }));
}

describe("UserMenu", () => {
  it("shows the user's name with the menu closed", () => {
    render(<UserMenu user={ada} onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Ada" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens with Profile and Logout", async () => {
    await openMenu();

    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("href", "#/profile");
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();
  });

  it("calls onSignOut from Logout", async () => {
    const onSignOut = vi.fn();
    await openMenu(onSignOut);

    await userEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(onSignOut).toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    await openMenu();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on a click outside", async () => {
    await openMenu();
    await userEvent.click(screen.getByText("Elsewhere"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
