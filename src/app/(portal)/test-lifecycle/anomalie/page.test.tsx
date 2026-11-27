import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Page from "./page";

const mocks = vi.hoisted(() => ({ filters: [] as unknown[], update: vi.fn() }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlIssues: (filters: unknown) => {
    mocks.filters.push(filters);
    return {
      data: [{
        id: "i1", feature_id: "f1", revision_id: null, kind: "file_deleted", status: "open",
        path: "src/a.feature", commit_sha: null, detail: {}, created_at: "", updated_by: null,
        updated_at: "", feature_code: "FEAT_001_FdR3", feature_title: "Pagamento",
      }],
      isLoading: false,
      isError: false,
    };
  },
  useUpdateTlIssue: () => ({ mutateAsync: mocks.update, isPending: false }),
  useTlScopes: () => ({ data: [] }),
  useImportTlIssueFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRestoreTlIssueHeader: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: () => true }) }));

describe("issues page", () => {
  it("defaults to open issues, links the feature and filters by kind", async () => {
    render(<Page />);
    expect(mocks.filters.at(-1)).toEqual({ status: "open" });
    expect(screen.getByRole("link", { name: "FEAT_001_FdR3" })).toHaveAttribute("href", "/test-lifecycle/f1");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "file_deleted");
    expect(mocks.filters.at(-1)).toEqual({ status: "open", kind: "file_deleted" });
    await userEvent.click(screen.getByRole("button", { name: "Risolta" }));
    expect(mocks.update).toHaveBeenCalledWith({ issueId: "i1", status: "resolved", featureId: "f1" });
  });
});
