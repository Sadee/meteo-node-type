import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockFetch, sentBody } from "../../test/mockFetch";
import { AuthPage } from "./AuthPage";

const ada = { id: 1, name: "Ada", email: "ada@example.com" };

describe("AuthPage", () => {
  it("signs in and passes the user up", async () => {
    const fetch = mockFetch({ "POST /api/auth/login": { body: ada } });
    const onAuthenticated = vi.fn();
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(ada));
    expect(sentBody(fetch)).toEqual({ email: "ada@example.com", password: "secret123" });
  });

  it("shows the error when sign-in fails", async () => {
    mockFetch({ "POST /api/auth/login": { status: 401, body: { error: "Invalid email or password" } } });
    const onAuthenticated = vi.fn();
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("registers a new account from the Register tab", async () => {
    const fetch = mockFetch({ "POST /api/auth/register": { status: 201, body: ada } });
    const onAuthenticated = vi.fn();
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Register" }));

    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(ada));
    expect(sentBody(fetch)).toEqual({ name: "Ada", email: "ada@example.com", password: "secret123" });
  });
});
