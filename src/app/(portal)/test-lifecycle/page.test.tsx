import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureFilters } from "@/types/test-lifecycle";
import TestLifecyclePage from "./page";

const mocks = vi.hoisted(() => ({ useTlFeatures: vi.fn() }));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "a@x.it" } }, status: "authenticated" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true, role: "qa_manager", isLoading: false }),
}));
vi.mock("@/hooks/useUsers", () => ({
  useUsers: () => ({ data: { items: [{ id: "u1", email: "a@x.it", name: "Anna" }] } }),
}));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlFeatures: mocks.useTlFeatures,
  useTlScopes: () => ({
    data: [
      { id: "s1", code: "FdR3", name: "Fondo rischi", area: "Core", feature_count: 1, status_counts: {} },
      { id: "s2", code: "Pay", name: "Pagamenti", area: "Core", feature_count: 0, status_counts: {} },
    ],
    isLoading: false,
  }),
  useCreateTlScope: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useUpdateTlScope: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useCreateTlFeature: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useTlIssues: () => ({ data: [], isLoading: false, isError: false }),
  useTlGitStatus: () => ({ data: { configured: false }, isLoading: false }),
  useTlGitSync: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("TestLifecyclePage", () => {
  beforeEach(() => {
    mocks.useTlFeatures.mockReset();
    mocks.useTlFeatures.mockReturnValue({ data: [], isLoading: false });
  });

  it("card click sets the scope filter without clearing the status filter", async () => {
    render(<TestLifecyclePage />);
    await userEvent.selectOptions(screen.getByLabelText("Stato"), "draft");
    await userEvent.click(screen.getByRole("button", { name: /FdR3/ }));
    expect(mocks.useTlFeatures).toHaveBeenLastCalledWith({
      status: "draft",
      scope_id: "s1",
    } satisfies TlFeatureFilters);
    expect(screen.getByLabelText("Stato")).toHaveValue("draft");
    expect(screen.getByLabelText("Ambito")).toHaveValue("s1");
  });

  it("dialog opened after selecting a scope pre-selects it", async () => {
    render(<TestLifecyclePage />);
    await userEvent.click(screen.getByRole("button", { name: /FdR3/ }));
    await userEvent.click(screen.getByRole("button", { name: /Nuova feature/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("select")).toHaveValue("s1");
  });
});
