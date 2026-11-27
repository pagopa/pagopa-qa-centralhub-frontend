import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlIssue } from "@/types/test-lifecycle";
import { RestoreHeaderDialog } from "./RestoreHeaderDialog";

const mocks = vi.hoisted(() => ({ run: vi.fn(), pending: false }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useRestoreTlIssueHeader: () => ({ mutateAsync: mocks.run, isPending: mocks.pending }),
}));

const ISSUE: TlIssue = {
  id: "i2",
  kind: "missing_header",
  status: "open",
  feature_id: "f1",
  feature_code: "FEAT_001_FdR3",
  feature_title: "Flusso",
  revision_id: null,
  path: "src/integration/fdr3/feature/a.feature",
  commit_sha: "abc",
  detail: { key: "missing_header", code: "FEAT_001_FdR3" },
  created_at: "2026-11-27T10:00:00Z",
  updated_at: "2026-11-27T10:00:00Z",
  updated_by: null,
};

function setup() {
  const onClose = vi.fn();
  render(<RestoreHeaderDialog issue={ISSUE} onClose={onClose} />);
  return onClose;
}

describe("RestoreHeaderDialog", () => {
  beforeEach(() => {
    mocks.run.mockReset().mockResolvedValue({ pr_url: "https://github.com/pagopa/x/pull/7", pr_error: null });
    mocks.pending = false;
  });

  it("shows the header that will be added and says nothing else changes", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("# qa-hub: FEAT_001_FdR3");
    expect(dialog).toHaveTextContent(ISSUE.path!);
    expect(dialog).toHaveTextContent(/non cambia nient'altro/i);
  });

  it("opens the PR and links it", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Apri la PR" }));
    expect(mocks.run).toHaveBeenCalledWith({ issueId: "i2" });
    expect(await screen.findByRole("link", { name: /PR/ })).toHaveAttribute(
      "href",
      "https://github.com/pagopa/x/pull/7",
    );
  });

  it("reports that the header was already back when no PR is needed", async () => {
    mocks.run.mockResolvedValue({ pr_url: null, pr_error: null });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Apri la PR" }));
    expect(await screen.findByText(/già tornata|non serve/i)).toBeInTheDocument();
  });

  it("warns when the PR could not be opened", async () => {
    mocks.run.mockResolvedValue({ pr_url: null, pr_error: "token scaduto" });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Apri la PR" }));
    expect(await screen.findByText(/token scaduto/)).toBeInTheDocument();
  });

  it("shows why it was refused and stays open", async () => {
    mocks.run.mockRejectedValue(
      new ApiError(409, { detail: { code: "restore_conflict", message: "Il file ha già l'intestazione di un'altra feature (FEAT_099_X)." } }),
    );
    const onClose = setup();
    await userEvent.click(screen.getByRole("button", { name: "Apri la PR" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("FEAT_099_X");
    expect(onClose).not.toHaveBeenCalled();
  });
});
