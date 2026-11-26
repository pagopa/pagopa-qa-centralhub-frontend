import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const nav = vi.hoisted(() => ({ search: "" }));
const auth = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(nav.search) }));
vi.mock("next-auth/react", () => ({ signIn: auth.signIn }));

beforeEach(() => {
  nav.search = "";
  auth.signIn.mockReset();
});

describe("Login page", () => {
  it("goes back to the page that was asked for", async () => {
    nav.search = `callbackUrl=${encodeURIComponent("/docs?item=abc")}`;
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Accedi con Google" }));
    expect(auth.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/docs?item=abc" });
  });

  it("goes to the home when there is no page to return to", async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Accedi con Google" }));
    expect(auth.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });

  it("ignores a callback that leaves the app", async () => {
    nav.search = `callbackUrl=${encodeURIComponent("https://evil.example/")}`;
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Accedi con Google" }));
    expect(auth.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });
});
