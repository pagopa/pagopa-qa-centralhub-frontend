import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitSyncButton } from "./GitSyncButton";

const mocks = vi.hoisted(() => ({
  status: { configured: true, last_run_at: null, last_error: null } as Record<string, unknown>,
  sync: vi.fn(),
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlGitStatus: () => ({ data: mocks.status, isLoading: false }),
  useTlGitSync: () => ({ mutateAsync: mocks.sync, isPending: false }),
}));

describe("GitSyncButton", () => {
  beforeEach(() => mocks.sync.mockReset());

  it("runs the sync when Git is configured", async () => {
    mocks.status = { configured: true, last_run_at: null, last_error: null };
    render(<GitSyncButton />);
    await userEvent.click(screen.getByRole("button", { name: /Sincronizza ora/ }));
    expect(mocks.sync).toHaveBeenCalled();
  });

  it("is disabled with an explanation when Git is not configured", () => {
    mocks.status = { configured: false, last_run_at: null, last_error: null };
    render(<GitSyncButton />);
    expect(screen.getByRole("button", { name: /Sincronizza ora/ })).toBeDisabled();
    expect(screen.getByText(/Git non configurato/)).toBeInTheDocument();
  });

  it("shows the last sync error", () => {
    mocks.status = { configured: true, last_run_at: "2026-11-20T10:00:00Z", last_error: "GitHub giù" };
    render(<GitSyncButton />);
    expect(screen.getByText(/GitHub giù/)).toBeInTheDocument();
  });
});
