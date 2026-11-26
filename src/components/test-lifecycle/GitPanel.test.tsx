import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureDetail, TlIssue, TlRevision } from "@/types/test-lifecycle";
import { GitPanel } from "./GitPanel";

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  update: vi.fn(),
  sync: undefined as unknown,
  issues: [] as unknown[],
  perms: new Set<string>(["edit:tl_feature"]),
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  usePublishTlRevision: () => ({ mutateAsync: mocks.publish, isPending: false }),
  useTlIssues: () => ({ data: mocks.issues, isLoading: false, isError: false }),
  useUpdateTlIssue: () => ({ mutateAsync: mocks.update, isPending: false }),
  // like the real hook: a disabled query has no data
  useTlBranchSync: (_f: string, _r: string, enabled: boolean) => ({ data: enabled ? mocks.sync : undefined }),
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (a: string) => mocks.perms.has(a) }),
}));

function rev(o: Partial<TlRevision> = {}): TlRevision {
  return {
    id: "r1", number: 1, status: "approved", pr_number: 101,
    pr_url: "https://github.com/pagopa/repo/pull/101", pr_state: "open", pr_error: null, work_branch: null,
    base_stale: false, merged_commit_sha: null, origin: "hub", ...o,
  } as TlRevision;
}

function feature(r: TlRevision | null, o: Partial<TlFeatureDetail> = {}): TlFeatureDetail {
  return {
    id: "f1", code: "FEAT_001_FdR3", working_revision: r, published_revision: null,
    git_path: "src/fdr/FEAT_001_FdR3_Pagamento.feature", open_issues: 0, ...o,
  } as TlFeatureDetail;
}

describe("GitPanel", () => {
  beforeEach(() => {
    mocks.publish.mockReset();
    mocks.update.mockReset();
    mocks.issues = [];
    mocks.sync = undefined;
    mocks.perms = new Set(["edit:tl_feature"]);
  });

  it("shows path and links the PR only when the URL is http(s)", () => {
    const { rerender } = render(<GitPanel feature={feature(rev())} />);
    expect(screen.getByText("src/fdr/FEAT_001_FdR3_Pagamento.feature")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /#101/ })).toHaveAttribute(
      "href", "https://github.com/pagopa/repo/pull/101",
    );
    rerender(<GitPanel feature={feature(rev({ pr_url: "javascript:alert(1)" }))} />);
    expect(screen.queryByRole("link", { name: /#101/ })).not.toBeInTheDocument();
    expect(screen.getByText(/#101/)).toBeInTheDocument();
  });

  it("offers 'Riprova PR' only for an approved revision without an open PR", async () => {
    const { rerender } = render(<GitPanel feature={feature(rev())} />);
    expect(screen.queryByRole("button", { name: "Riprova PR" })).not.toBeInTheDocument();
    rerender(
      <GitPanel feature={feature(rev({ pr_state: null, pr_number: null, pr_url: null, pr_error: "boom" }))} />,
    );
    expect(screen.getByText("boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Riprova PR" }));
    expect(mocks.publish).toHaveBeenCalledWith({ featureId: "f1", revisionId: "r1" });
    rerender(<GitPanel feature={feature(rev({ status: "draft", pr_state: null }))} />);
    expect(screen.queryByRole("button", { name: "Riprova PR" })).not.toBeInTheDocument();
  });

  it("hides 'Riprova PR' without edit or git permission", () => {
    mocks.perms = new Set();
    render(<GitPanel feature={feature(rev({ pr_state: "closed" }))} />);
    expect(screen.queryByRole("button", { name: "Riprova PR" })).not.toBeInTheDocument();
  });

  it("lists the feature issues and resolves one", async () => {
    mocks.perms = new Set(["manage:tl_git"]);
    mocks.issues = [
      {
        id: "i1", feature_id: "f1", revision_id: null, kind: "structural_change", status: "open",
        path: "src/a.feature", commit_sha: "abcdef1234", detail: { changes: [] },
        created_at: "2026-11-20T10:00:00Z", updated_by: null, updated_at: "2026-11-20T10:00:00Z",
        feature_code: "FEAT_001_FdR3", feature_title: "Pagamento",
      } satisfies TlIssue,
    ];
    render(<GitPanel feature={feature(rev())} />);
    expect(screen.getByText("Modifica strutturale")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Risolta" }));
    expect(mocks.update).toHaveBeenCalledWith({ issueId: "i1", status: "resolved", featureId: "f1" });
  });
});

describe("GitPanel import source", () => {
  it("shows where the feature was imported from", () => {
    render(
      <GitPanel
        feature={feature(rev(), {
          import_source: {
            url: "https://github.com/pagopa/repo/blob/PQ-827/src/a.feature", branch: "PQ-827", path: "src/a.feature",
            blob_sha: "x", imported_at: "",
          },
        })}
      />,
    );
    expect(screen.getByRole("link", { name: "PQ-827" })).toHaveAttribute("href", "https://github.com/pagopa/repo/blob/PQ-827/src/a.feature");
  });

  it("shows no cleanup PR, not even for a feature imported before it was removed", () => {
    render(
      <GitPanel
        feature={feature(rev(), {
          import_source: {
            url: "javascript:x", branch: "PQ-827", path: "src/a.feature", blob_sha: "x", imported_at: "",
            cleanup: { state: "error", pr_number: null, pr_url: null, error: "GitHub giù", note: null },
          },
        })}
      />,
    );
    expect(screen.queryByRole("link", { name: "PQ-827" })).toBeNull();
    expect(screen.queryByText(/pulizia/i)).toBeNull();
    expect(screen.queryByText(/GitHub giù/)).toBeNull();
    expect(screen.queryByRole("button", { name: /pulizia/i })).toBeNull();
  });

  describe("working branch", () => {
    it("shows the branch, the sync state and a comparison link", () => {
      mocks.sync = {
        branch: "qa-hub/FEAT_001_FdR3-r1", state: "hub_ahead", hub_unsynced: true, repo_changed: false,
        compare_url: "https://github.com/pagopa/repo/compare/main...qa-hub/FEAT_001_FdR3-r1",
      };
      render(<GitPanel feature={feature(rev({ work_branch: "qa-hub/FEAT_001_FdR3-r1", status: "draft", pr_number: null, pr_state: null }))} />);
      expect(screen.getByText("qa-hub/FEAT_001_FdR3-r1")).toBeInTheDocument();
      expect(screen.getByText("Non ancora sul repo")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Confronta su GitHub" })).toHaveAttribute(
        "href", "https://github.com/pagopa/repo/compare/main...qa-hub/FEAT_001_FdR3-r1",
      );
    });

    it("shows the branch but no sync state once the revision is merged", () => {
      mocks.sync = { branch: "b", state: "branch_missing", hub_unsynced: true, repo_changed: false, compare_url: null };
      render(<GitPanel feature={feature(null, { published_revision: rev({ status: "merged", work_branch: "qa-hub/FEAT_001_FdR3-r1" }) })} />);
      expect(screen.getByText("qa-hub/FEAT_001_FdR3-r1")).toBeInTheDocument();
      expect(screen.queryByText("Branch da creare")).toBeNull();
    });

    it("shows the sync state of an approved revision still waiting for its merge", () => {
      mocks.sync = { branch: "b", state: "in_sync", hub_unsynced: false, repo_changed: false, compare_url: null };
      render(<GitPanel feature={feature(rev({ status: "approved", work_branch: "b" }))} />);
      expect(screen.getByText("Allineato al repo")).toBeInTheDocument();
    });

    it("says there is none for a hub-only draft", () => {
      render(<GitPanel feature={feature(rev({ status: "draft", pr_number: null, pr_state: null }))} />);
      expect(screen.getByText("Nessun branch di lavoro")).toBeInTheDocument();
    });

    it("does not link a comparison that is not http(s)", () => {
      mocks.sync = { branch: "b", state: "in_sync", hub_unsynced: false, repo_changed: false, compare_url: "javascript:x" };
      render(<GitPanel feature={feature(rev({ work_branch: "b" }))} />);
      expect(screen.queryByRole("link", { name: "Confronta su GitHub" })).toBeNull();
    });
  });
});
