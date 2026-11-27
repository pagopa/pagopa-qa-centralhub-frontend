import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlIssue } from "@/types/test-lifecycle";
import { ImportFileDialog } from "./ImportFileDialog";

const mocks = vi.hoisted(() => ({ run: vi.fn(), pending: false }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlScopes: () => ({
    data: [
      { id: "s1", code: "FdR3", name: "Fondo rischi" },
      { id: "s2", code: "WISP", name: "Dismissione WISP" },
    ],
  }),
  useImportTlIssueFile: () => ({ mutateAsync: mocks.run, isPending: mocks.pending }),
}));

const ISSUE: TlIssue = {
  id: "i1",
  kind: "unmanaged_file",
  status: "open",
  feature_id: null,
  feature_code: null,
  feature_title: null,
  revision_id: null,
  path: "src/integration/fdr3/feature/nuovo.feature",
  commit_sha: "abc",
  detail: { key: "unmanaged", scope_code: "FdR3" },
  created_at: "2026-11-27T10:00:00Z",
  updated_at: "2026-11-27T10:00:00Z",
  updated_by: null,
};

const DONE = {
  feature_id: "f9",
  code: "FEAT_012_FdR3",
  alignment_pending: true,
  pr_url: "https://github.com/pagopa/x/pull/12",
  pr_error: null,
};

function setup(issue: TlIssue = ISSUE) {
  const onClose = vi.fn();
  render(<ImportFileDialog issue={issue} onClose={onClose} />);
  return onClose;
}

describe("ImportFileDialog", () => {
  beforeEach(() => {
    mocks.run.mockReset().mockResolvedValue(DONE);
    mocks.pending = false;
  });

  it("names the file and preselects the scope its folder suggests", () => {
    setup();
    expect(screen.getByRole("dialog")).toHaveTextContent(ISSUE.path!);
    expect(screen.getByLabelText("Ambito")).toHaveValue("FdR3");
  });

  it("makes the user choose the scope when the folder does not tell it", async () => {
    setup({ ...ISSUE, detail: { key: "unmanaged", scope_code: null } });
    expect(screen.getByLabelText("Ambito")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Importa" })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText("Ambito"), "WISP");
    expect(screen.getByRole("button", { name: "Importa" })).toBeEnabled();
  });

  it("imports with the chosen scope and shows the new code and the alignment PR", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Importa" }));
    expect(mocks.run).toHaveBeenCalledWith({ issueId: "i1", scopeCode: "FdR3" });
    expect(await screen.findByText("FEAT_012_FdR3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PR di allineamento/ })).toHaveAttribute(
      "href",
      "https://github.com/pagopa/x/pull/12",
    );
  });

  it("warns when the pull request could not be opened", async () => {
    mocks.run.mockResolvedValue({ ...DONE, pr_url: null, pr_error: "token scaduto" });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Importa" }));
    expect(await screen.findByText(/token scaduto/)).toBeInTheDocument();
  });

  it("shows why the import was refused and stays open", async () => {
    mocks.run.mockRejectedValue(
      new ApiError(409, { detail: { code: "adopt_conflict", message: "Il codice FEAT_001_FdR3 è già usato." } }),
    );
    const onClose = setup();
    await userEvent.click(screen.getByRole("button", { name: "Importa" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Il codice FEAT_001_FdR3 è già usato.");
    expect(onClose).not.toHaveBeenCalled();
  });
});
