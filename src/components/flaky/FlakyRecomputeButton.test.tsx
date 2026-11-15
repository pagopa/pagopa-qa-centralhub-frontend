import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { FlakyRecomputeButton } from "./FlakyRecomputeButton";

const hooks = vi.hoisted(() => ({ mutate: vi.fn(), state: { isPending: false, error: null as unknown } }));
vi.mock("@/hooks/useFlaky", () => ({
  useRecomputeFlaky: () => ({ mutate: hooks.mutate, ...hooks.state }),
}));

describe("FlakyRecomputeButton", () => {
  beforeEach(() => {
    hooks.mutate.mockReset();
    hooks.state = { isPending: false, error: null };
  });

  it("recomputes on click", async () => {
    render(<FlakyRecomputeButton canManage />);
    await userEvent.click(screen.getByRole("button", { name: "Ricalcola ora" }));
    expect(hooks.mutate).toHaveBeenCalledTimes(1);
  });

  it("is hidden without manage:flaky", () => {
    render(<FlakyRecomputeButton canManage={false} />);
    expect(screen.queryByRole("button", { name: "Ricalcola ora" })).not.toBeInTheDocument();
  });

  it("is disabled while running", () => {
    hooks.state = { isPending: true, error: null };
    render(<FlakyRecomputeButton canManage />);
    expect(screen.getByRole("button", { name: /Ricalcolo…/ })).toBeDisabled();
  });

  it("explains a 409 as a recompute already in progress", () => {
    hooks.state = { isPending: false, error: new ApiError(409, { detail: "x" }) };
    render(<FlakyRecomputeButton canManage />);
    expect(screen.getByRole("status")).toHaveTextContent("Ricalcolo in corso");
  });

  it("reports other errors", () => {
    hooks.state = { isPending: false, error: new ApiError(500, null) };
    render(<FlakyRecomputeButton canManage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Ricalcolo non riuscito");
  });
});
