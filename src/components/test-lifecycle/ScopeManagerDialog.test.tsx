import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TlScope } from "@/types/test-lifecycle";
import { ScopeManagerDialog } from "./ScopeManagerDialog";

const SCOPES: TlScope[] = [
  {
    id: "s1", code: "FdR3", name: "Fondo rischi", area: "Core", repo_folder: null, owner_team: null,
    next_feature_number: 3, created_at: "", updated_at: "", feature_count: 2, status_counts: {},
  },
  {
    id: "s2", code: "Vuoto", name: "Senza feature", area: null, repo_folder: null, owner_team: null,
    next_feature_number: 1, created_at: "", updated_at: "", feature_count: 0, status_counts: {},
  },
];

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlScopes: () => ({ data: SCOPES, isLoading: false }),
  useCreateTlScope: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useUpdateTlScope: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}));

describe("ScopeManagerDialog", () => {
  it("disables the code field when the scope has features", async () => {
    render(<ScopeManagerDialog open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Modifica ambito FdR3" }));
    expect(screen.getByLabelText("Codice")).toBeDisabled();
  });

  it("keeps the code editable for a scope without features", async () => {
    render(<ScopeManagerDialog open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Modifica ambito Vuoto" }));
    expect(screen.getByLabelText("Codice")).toBeEnabled();
  });
});
