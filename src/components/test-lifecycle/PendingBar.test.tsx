import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingBar } from "./PendingBar";

const mocks = vi.hoisted(() => ({ count: 0 }));
vi.mock("@tanstack/react-query", async (orig) => ({
  ...(await orig<typeof import("@tanstack/react-query")>()),
  useIsMutating: () => mocks.count,
}));

describe("PendingBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.count = 0;
  });
  afterEach(() => vi.useRealTimers());

  it("shows nothing when no operation is running", () => {
    render(<PendingBar />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not flash for a quick operation", () => {
    mocks.count = 1;
    render(<PendingBar />);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("announces a slow operation, then says that it is taking longer", () => {
    mocks.count = 1;
    render(<PendingBar />);
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole("status")).toHaveTextContent("Operazione in corso…");
    expect(screen.queryByText(/più tempo del solito/)).toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("status")).toHaveTextContent("più tempo del solito");
  });
});
