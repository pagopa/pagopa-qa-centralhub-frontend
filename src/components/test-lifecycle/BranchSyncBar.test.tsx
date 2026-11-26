import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlBranchSync, TlBranchSyncState, TlRevision } from "@/types/test-lifecycle";
import { BranchSyncBar } from "./BranchSyncBar";

const mocks = vi.hoisted(() => ({
  data: undefined as TlBranchSync | undefined,
  push: vi.fn(),
  pull: vi.fn(),
  saveAll: vi.fn(),
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlBranchSync: () => ({ data: mocks.data }),
  usePushTlBranch: () => ({ mutateAsync: mocks.push, isPending: false }),
  usePullTlBranch: () => ({ mutateAsync: mocks.pull, isPending: false }),
}));

const writer = {
  saveAll: (...a: []) => mocks.saveAll(...a),
  afterPendingWrites: <T,>(fn: () => Promise<T>) => fn(),
};

function sync(state: TlBranchSyncState, extra: Partial<TlBranchSync> = {}): TlBranchSync {
  return {
    branch: "qa-hub/FEAT_001-r1",
    state,
    hub_unsynced: state === "hub_ahead" || state === "branch_missing" || state === "file_missing",
    repo_changed: state === "repo_ahead" || state === "diverged",
    compare_url: "https://github.com/org/repo/compare/main...qa-hub/FEAT_001-r1",
    ...extra,
  };
}

function rev(over: Partial<TlRevision> = {}): TlRevision {
  return { id: "r1", number: 1, status: "draft", work_branch: "qa-hub/FEAT_001-r1", ...over } as TlRevision;
}

function renderBar(props: { revision?: TlRevision; editable?: boolean } = {}) {
  const onChanged = vi.fn();
  const view = render(
    <BranchSyncBar
      featureId="f1"
      revision={props.revision ?? rev()}
      editable={props.editable ?? true}
      writer={writer}
      onChanged={onChanged}
    />,
  );
  return { onChanged, ...view };
}

describe("BranchSyncBar", () => {
  beforeEach(() => {
    mocks.data = sync("in_sync");
    mocks.push.mockReset().mockResolvedValue(sync("in_sync"));
    mocks.pull.mockReset().mockResolvedValue({});
    mocks.saveAll.mockReset().mockResolvedValue(true);
  });

  it("shows nothing for a revision without branch that cannot be edited", () => {
    const { container } = renderBar({ revision: rev({ work_branch: null }), editable: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("only offers Salva tutti, saving to the hub, when there is no working branch", async () => {
    renderBar({ revision: rev({ work_branch: null }) });
    expect(screen.queryByText(/branch/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Salva tutti" }));
    expect(mocks.saveAll).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("shows the branch and the state", () => {
    renderBar();
    expect(screen.getByText("qa-hub/FEAT_001-r1")).toBeInTheDocument();
    expect(screen.getByText("Allineato al repo")).toBeInTheDocument();
  });

  it("flags content that is not on the repository yet", () => {
    mocks.data = sync("hub_ahead");
    renderBar();
    expect(screen.getByText("Non ancora sul repo")).toBeInTheDocument();
  });

  it("Salva tutti saves every draft first and then pushes", async () => {
    mocks.data = sync("hub_ahead");
    renderBar();
    await userEvent.click(screen.getByRole("button", { name: "Salva tutti" }));
    expect(mocks.saveAll).toHaveBeenCalled();
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith({ featureId: "f1", revisionId: "r1" }),
    );
    expect(mocks.saveAll.mock.invocationCallOrder[0]).toBeLessThan(mocks.push.mock.invocationCallOrder[0]);
  });

  it("does not push when a draft could not be saved", async () => {
    mocks.saveAll.mockResolvedValue(false);
    mocks.data = sync("hub_ahead");
    renderBar();
    await userEvent.click(screen.getByRole("button", { name: "Salva tutti" }));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/non sono state salvate/i);
  });

  it("opens the divergence dialog on a draft whose repository changed; accept pulls and reloads", async () => {
    mocks.data = sync("repo_ahead");
    const { onChanged } = renderBar();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accetta la versione del repo" }));
    expect(mocks.pull).toHaveBeenCalledWith({ featureId: "f1", revisionId: "r1" });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("overwrite saves the hub drafts and pushes with overwrite", async () => {
    mocks.data = sync("diverged");
    renderBar();
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "Sovrascrivi il repo con l'hub" }));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith({ featureId: "f1", revisionId: "r1", overwrite: true }),
    );
    expect(mocks.saveAll).toHaveBeenCalled();
  });

  it("lets the person decide later and come back with Risolvi", async () => {
    mocks.data = sync("repo_ahead");
    renderBar();
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "Decido dopo" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "Risolvi" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("opens the dialog when a push is answered with repo_changed", async () => {
    mocks.data = sync("hub_ahead");
    mocks.push.mockRejectedValue(new ApiError(409, { detail: { code: "repo_changed" } }));
    renderBar();
    await userEvent.click(screen.getByRole("button", { name: "Salva tutti" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("is only an information notice on a revision that is in review", () => {
    mocks.data = sync("repo_ahead");
    renderBar({ revision: rev({ status: "in_review" }), editable: false });
    expect(screen.getByText(/verranno importate al merge/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows a notice and no dialog when Git cannot be reached", () => {
    mocks.data = sync("unreachable");
    renderBar();
    expect(screen.getByText("Repo non raggiungibile")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("links the comparison only when it exists", () => {
    mocks.data = sync("in_sync", { compare_url: null });
    renderBar();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
