import { useEffect, useReducer } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { STALE_LOCK_MESSAGE } from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlScenario } from "@/types/test-lifecycle";
import FeatureDetailPage from "./page";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  comments: null as unknown[] | null,
  featureData: null as unknown,
  listeners: new Set<() => void>(),
  refetch: vi.fn(),
  transition: vi.fn(),
  updateRevision: vi.fn(),
  updateScenario: vi.fn(),
  addScenario: vi.fn(),
  removeScenario: vi.fn(),
  validate: vi.fn(),
  applyRebase: vi.fn(),
  rebaseView: null as unknown,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "f1" }),
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/components/test-lifecycle/TlDeleteDialog", () => ({
  TlDeleteDialog: ({ target, onDeleted }: { target: { id: string; label: string } | null; onDeleted?: () => void }) =>
    target ? (
      <div data-testid="delete-dialog">
        {`feature:${target.id}`}
        <button onClick={() => onDeleted?.()}>confirm-delete</button>
      </div>
    ) : null,
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: { user: { email: "a@x.it" } } }),
}));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock("@/hooks/useUsers", () => ({ useUsers: () => ({ data: { items: [] } }) }));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlCategoryTags: () => ({ data: undefined }),
  useTlTagCleanup: () => ({ data: undefined }),
  useTlScopes: () => ({ data: [{ id: "s1", code: "FdR3", name: "Fondo" }, { id: "s2", code: "WISP", name: "Dismissione WISP" }] }),
  useMoveTlFeatures: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTlBranchSync: () => ({ data: undefined }),
  usePushTlBranch: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePullTlBranch: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useApplyTlTagCleanup: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useImportTlGit: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTlStepSuggestions: () => ({ data: [] }),
  useTlFeature: () => {
    // Re-renders when the test swaps the feature data, like a react-query refetch would.
    const [, force] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
      mocks.listeners.add(force);
      return () => void mocks.listeners.delete(force);
    }, []);
    return { data: (mocks.featureData as TlFeatureDetail | null) ?? FEATURE, isLoading: false, isError: false, refetch: mocks.refetch };
  },
  useTlTransition: () => ({ mutateAsync: mocks.transition, isPending: false }),
  useUpdateTlRevision: () => ({ mutateAsync: mocks.updateRevision }),
  useUpdateTlScenario: () => ({ mutateAsync: mocks.updateScenario }),
  useAddTlScenario: () => ({ mutateAsync: mocks.addScenario }),
  useRemoveTlScenario: () => ({ mutateAsync: mocks.removeScenario }),
  useUpdateTlFeature: () => ({ mutate: vi.fn() }),
  useCreateTlJiraTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useValidateSteps: () => ({ mutate: mocks.validate }),
  useTlComments: () => ({
    data: mocks.comments ?? [{ id: "c1", revision_id: "r1", scenario_id: "sc1", scenario_tag: "@FDR3_001_01", author: "a", body: "x", resolved: false, created_at: "2026-11-20T10:00:00Z" }],
    isLoading: false,
    isError: false,
  }),
  useAddTlComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useResolveTlComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTlHistory: () => ({ data: [], isLoading: false, isError: false }),
  useTlIssues: () => ({ data: [], isLoading: false, isError: false }),
  useUpdateTlIssue: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePublishTlRevision: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useApplyTlRebase: () => ({ mutateAsync: mocks.applyRebase, isPending: false }),
  useTlRebase: () => ({ data: mocks.rebaseView, isLoading: false, isError: false }),
  useTlVersion: () => ({ data: undefined, isLoading: false, isError: false }),
  useTlPreview: () => ({ data: { file: "# qa-hub: FEAT_001_FdR3", errors: [] }, isLoading: false }),
}));

function sc(id: string, n: number, title: string): TlScenario {
  return {
    id, number: n, tag: `@FDR3_001_0${n}`, position: n, title, kind: "scenario",
    polarity: "positivo", extra_tags: [], steps: "Dato x", examples: null, detail_link: null, errors: [],
  };
}

const FEATURE = {
  id: "f1", code: "FEAT_001_FdR3", number: 1, status: "draft", scope_id: "s1", scope_code: "FdR3", scope_name: null,
  design_owner_id: null, reviewer_id: null, impl_owner_id: null, test_type: null, jira_design_key: null,
  jira_impl_key: null, created_by: "a@x.it", created_at: "", updated_at: "",
  working_revision: {
    id: "r1", number: 1, status: "draft", lock_version: 3, title: "Pagamento avviso",
    description: null, background_steps: null, requirements_url: null, product_issue_key: null,
    reverse_engineering: false, design_estimate_days: null, impl_estimate_days: null,
    created_by: "a@x.it", approved_by: null, approved_at: null, created_at: "", updated_at: "",
    scenarios: [sc("sc1", 1, "Primo"), sc("sc2", 2, "Secondo")], background_errors: [], origin: "hub", pr_number: null, pr_url: null, pr_state: null, pr_error: null, work_branch: null, base_stale: false, merged_commit_sha: null,
  },
  published_revision: null,
  git_path: null,
  open_issues: 0,
  jira: [], jira_history: [], jira_error: null, jira_qa_epic_key: null, jira_qa_epic_effective: null,
  transitions: [
    { action: "submit", allowed: true, reasons: [] },
    { action: "approve", allowed: false, reasons: ["Non in review"] },
    { action: "request_changes", allowed: false, reasons: ["Non in review"] },
    { action: "reopen", allowed: false, reasons: ["Già in bozza"] },
  ],
} as TlFeatureDetail;

const titles = () => screen.getAllByLabelText("Titolo scenario");

describe("FeatureDetailPage", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) if (vi.isMockFunction(m)) m.mockReset();
    mocks.comments = null;
    mocks.featureData = null;
    mocks.refetch.mockResolvedValue({});
    mocks.updateScenario.mockResolvedValue(sc("sc1", 1, "x"));
    mocks.updateRevision.mockImplementation(async (v: { lock_version: number }) => ({
      ...FEATURE.working_revision, lock_version: v.lock_version + 1,
    }));
  });

  it("shows a single page-wide banner on stale lock, keeps text and blocks every save", async () => {
    mocks.updateScenario.mockRejectedValue(new ApiError(409, { detail: { code: "stale_lock" } }));
    render(<FeatureDetailPage />);
    await userEvent.type(titles()[0], " modificato");
    await userEvent.tab();

    expect(await screen.findAllByText(STALE_LOCK_MESSAGE)).toHaveLength(1);
    expect(titles()[0]).toHaveValue("Primo modificato");
    const cards = screen.getAllByRole("article");
    expect(within(cards[1]).getByRole("button", { name: "Salva" })).toBeDisabled();
    expect(within(cards[1]).getByRole("button", { name: "Rimuovi scenario" })).toBeDisabled();

    await userEvent.type(titles()[1], "!");
    await userEvent.tab();
    expect(mocks.updateScenario).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Ricarica" }));
    expect(mocks.refetch).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText(STALE_LOCK_MESSAGE)).not.toBeInTheDocument());
  });

  it("offers Salva tutti on the scenarios of an editable draft", () => {
    render(<FeatureDetailPage />);
    expect(screen.getByRole("button", { name: "Salva tutti" })).toBeInTheDocument();
  });

  it("reopens through the popup passing the branch name the person chose", async () => {
    mocks.transition.mockResolvedValue({});
    mocks.featureData = {
      ...FEATURE,
      status: "implemented",
      working_revision: null,
      published_revision: { ...FEATURE.working_revision!, id: "r9", number: 2, status: "merged" },
      transitions: FEATURE.transitions.map((t) => (t.action === "reopen" ? { ...t, allowed: true, reasons: [] } : t)),
    } as TlFeatureDetail;
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getByRole("button", { name: "Riapri" }));
    const dialog = await screen.findByRole("dialog");
    const field = within(dialog).getByLabelText("Nome del branch");
    await userEvent.clear(field);
    await userEvent.type(field, "feature/pos-fix");
    await userEvent.click(within(dialog).getByRole("button", { name: "Riapri" }));
    expect(mocks.transition).toHaveBeenCalledWith(
      expect.objectContaining({ action: "reopen", revisionId: "r9", branchName: "feature/pos-fix" }),
    );
  });

  it("moves the feature from the header through the move dialog", async () => {
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getByRole("button", { name: "Sposta" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("FEAT_001_FdR3");
    expect(within(dialog).getByLabelText("Ambito di arrivo")).toBeInTheDocument();
  });

  it("keeps unsaved scenario text when switching tabs", async () => {
    render(<FeatureDetailPage />);
    await userEvent.type(titles()[0], " in corso");
    await userEvent.click(screen.getByRole("tab", { name: "Anteprima file" }));
    expect(await screen.findByText("# qa-hub: FEAT_001_FdR3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /^Scenari/ }));
    expect(titles()[0]).toHaveValue("Primo in corso");
  });

  it("lists tabs in order and jumps to Review with the scenario preselected", async () => {
    render(<FeatureDetailPage />);
    // Counters (scenarios, open comments) are chips inside the trigger text: strip them.
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.replace(/\d.*$/, ""))).toEqual([
      "Scenari", "Review", "Storico", "Git", "Jira", "NRT", "Anteprima file",
    ]);
    await userEvent.click(screen.getAllByRole("button", { name: /Commenta/ })[0]);
    expect(await screen.findByRole("combobox", { name: "Scenario" })).toHaveValue("sc1");
  });

  it("keeps the unsent comment draft when switching tabs", async () => {
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getByRole("tab", { name: /^Review/ }));
    await userEvent.type(screen.getByLabelText("Nuovo commento"), "bozza commento");
    await userEvent.click(screen.getByRole("tab", { name: /^Scenari/ }));
    await userEvent.click(screen.getByRole("tab", { name: /^Review/ }));
    expect(screen.getByLabelText("Nuovo commento")).toHaveValue("bozza commento");
  });

  it("edits the Contesto with background validation and saves it with the lock", async () => {
    render(<FeatureDetailPage />);
    await userEvent.type(screen.getByLabelText("Step del contesto"), "Dato un EC");
    await waitFor(() =>
      expect(mocks.validate).toHaveBeenCalledWith(
        expect.objectContaining({ steps: "Dato un EC", background: true }),
        expect.anything(),
      ),
    );
    await userEvent.tab();
    await waitFor(() =>
      expect(mocks.updateRevision).toHaveBeenCalledWith(
        expect.objectContaining({ background_steps: "Dato un EC", lock_version: 3 }),
      ),
    );
  });

  it("saves the description through the revision", async () => {
    render(<FeatureDetailPage />);
    await userEvent.type(screen.getByLabelText("Descrizione"), "Come EC voglio pagare");
    await userEvent.tab();
    await waitFor(() =>
      expect(mocks.updateRevision).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Come EC voglio pagare" }),
      ),
    );
  });

  it("runs a transition only after the in-flight save completes", async () => {
    let finishSave: () => void = () => {};
    mocks.updateScenario.mockImplementation(
      () => new Promise((r) => (finishSave = () => r(sc("sc1", 1, "Primo!")))),
    );
    mocks.transition.mockResolvedValue(FEATURE);
    render(<FeatureDetailPage />);
    await userEvent.type(titles()[0], "!");
    // Clicking the button blurs the input, which starts the save.
    await userEvent.click(screen.getByRole("button", { name: "Invia in review" }));
    expect(mocks.updateScenario).toHaveBeenCalledTimes(1);
    expect(mocks.transition).not.toHaveBeenCalled();

    finishSave();
    await waitFor(() => expect(mocks.transition).toHaveBeenCalledWith(
      expect.objectContaining({ action: "submit", revisionId: "r1" }),
    ));
    expect(mocks.updateScenario).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+S in the detail page flushes pending edits and prevents the browser dialog", async () => {
    render(<FeatureDetailPage />);
    await userEvent.type(titles()[0], " nuovo");
    const notPrevented = fireEvent.keyDown(titles()[0], { key: "s", ctrlKey: true });
    expect(notPrevented).toBe(false);
    await waitFor(() => expect(mocks.updateScenario).toHaveBeenCalledTimes(1));
  });

  it("Ctrl+Enter focuses the new scenario title when empty and adds the scenario when filled", async () => {
    mocks.addScenario.mockResolvedValue(sc("sc3", 3, "Nuovo"));
    render(<FeatureDetailPage />);
    const input = screen.getByLabelText("Titolo nuovo scenario");
    fireEvent.keyDown(titles()[0], { key: "Enter", ctrlKey: true });
    expect(input).toHaveFocus();
    await userEvent.type(input, "Nuovo");
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(mocks.addScenario).toHaveBeenCalledTimes(1));
  });

  it("Comprimi tutti collapses every card and Espandi tutti restores them", async () => {
    render(<FeatureDetailPage />);
    expect(titles()).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Comprimi tutti" }));
    expect(screen.queryAllByLabelText("Titolo scenario")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Espandi tutti" }));
    expect(titles()).toHaveLength(2);
  });

  it("duplicate creates a copy titled '<title> (copia)' then copies the content", async () => {
    mocks.addScenario.mockResolvedValue(sc("sc3", 3, "Primo (copia)"));
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getAllByRole("button", { name: "Duplica scenario" })[0]);
    await waitFor(() => expect(mocks.addScenario).toHaveBeenCalledTimes(1));
    expect(mocks.addScenario).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: "f1", title: "Primo (copia)", kind: "scenario", polarity: "positivo" }),
    );
    await waitFor(() => expect(mocks.updateScenario).toHaveBeenCalledTimes(1));
    expect(mocks.updateScenario).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioId: "sc3", steps: "Dato x", extra_tags: [] }),
    );
  });

  it("a duplicated card is remounted with the copied content", async () => {
    const withCopy = (steps: string): TlFeatureDetail => ({
      ...FEATURE,
      working_revision: {
        ...FEATURE.working_revision!,
        scenarios: [...FEATURE.working_revision!.scenarios, { ...sc("sc3", 3, "Primo (copia)"), steps }],
      },
    });
    // After the add the refetched card is empty; after the update the server has the content.
    mocks.featureData = withCopy("");
    mocks.addScenario.mockResolvedValue(sc("sc3", 3, "Primo (copia)"));
    mocks.updateScenario.mockImplementation(async () => {
      mocks.featureData = withCopy("Dato x");
      mocks.listeners.forEach((l) => l());
      return sc("sc3", 3, "Primo (copia)");
    });
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getAllByRole("button", { name: "Duplica scenario" })[0]);
    await waitFor(() => expect(screen.getAllByLabelText("Step")[2]).toHaveValue("Dato x"));
  });

  it("a drop that is not a scenario drag keeps the browser default", () => {
    render(<FeatureDetailPage />);
    const notPrevented = fireEvent.drop(screen.getAllByRole("article")[1], { dataTransfer: { getData: () => "" } });
    expect(notPrevented).toBe(true);
  });

  it("Ctrl+Enter inside a steps textarea does not steal the focus", () => {
    render(<FeatureDetailPage />);
    const steps = screen.getAllByLabelText("Step")[0];
    steps.focus();
    fireEvent.keyDown(steps, { key: "Enter", ctrlKey: true });
    expect(screen.getByLabelText("Titolo nuovo scenario")).not.toHaveFocus();
  });

  it("move down sends the next scenario position", async () => {
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getAllByRole("button", { name: "Sposta scenario in basso" })[0]);
    await waitFor(() => expect(mocks.updateScenario).toHaveBeenCalledTimes(1));
    expect(mocks.updateScenario).toHaveBeenCalledWith(expect.objectContaining({ scenarioId: "sc1", position: 2 }));
  });

  it("first scenario cannot move up and last cannot move down", () => {
    render(<FeatureDetailPage />);
    expect(screen.getAllByRole("button", { name: "Sposta scenario in alto" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Sposta scenario in basso" })[1]).toBeDisabled();
  });

  it("dropping a card on another sends the target position", async () => {
    render(<FeatureDetailPage />);
    const handles = screen.getAllByRole("button", { name: "Trascina scenario" });
    const cards = screen.getAllByRole("article");
    fireEvent.dragStart(handles[0], { dataTransfer: { setData: vi.fn(), effectAllowed: "" } });
    fireEvent.drop(cards[1], { dataTransfer: { getData: () => "" } });
    await waitFor(() => expect(mocks.updateScenario).toHaveBeenCalledTimes(1));
    expect(mocks.updateScenario).toHaveBeenCalledWith(expect.objectContaining({ scenarioId: "sc1", position: 2 }));
  });

  it("dropping a card on itself sends nothing", () => {
    render(<FeatureDetailPage />);
    const handles = screen.getAllByRole("button", { name: "Trascina scenario" });
    const cards = screen.getAllByRole("article");
    fireEvent.dragStart(handles[0], { dataTransfer: { setData: vi.fn(), effectAllowed: "" } });
    fireEvent.drop(cards[0], { dataTransfer: { getData: () => "" } });
    expect(mocks.updateScenario).not.toHaveBeenCalled();
  });

  it("selecting an index item expands a collapsed card", async () => {
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getByRole("button", { name: "Comprimi tutti" }));
    await userEvent.click(screen.getByRole("button", { name: /#2 Secondo/ }));
    expect(titles()).toHaveLength(1);
    expect(titles()[0]).toHaveValue("Secondo");
  });

  it("tabs show the scenario count and unresolved comment count", () => {
    render(<FeatureDetailPage />);
    expect(within(screen.getByRole("tab", { name: /^Scenari/ })).getByText("2 scenari")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /^Review/ })).getByText("1 commenti aperti")).toBeInTheDocument();
  });

  it("Review tab hides the counter at zero", () => {
    mocks.comments = [];
    render(<FeatureDetailPage />);
    expect(within(screen.getByRole("tab", { name: /^Review/ })).queryByText(/commenti aperti/)).not.toBeInTheDocument();
  });

  it("tabs keep working by role and name", async () => {
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getByRole("tab", { name: /^Review/ }));
    expect(screen.getByRole("tab", { name: /^Review/ })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("tab", { name: "Storico" }));
    expect(screen.getByRole("tab", { name: "Storico" })).toHaveAttribute("aria-selected", "true");
  });

  it("uses the line tab bar and keeps every tab reachable", () => {
    render(<FeatureDetailPage />);
    const list = screen.getByRole("tablist");
    expect(list).toHaveAttribute("data-variant", "line");
    // overrides that must beat the shadcn variant: auto height, and the underline sitting on the border
    expect(list.className).toContain("group-data-horizontal/tabs:!h-auto");
    const first = screen.getAllByRole("tab")[0];
    expect(first.className).toContain("h-auto");
    expect(first.className).not.toContain("h-[calc(100%-1px)]");
    expect(first.className).toContain("after:!-bottom-px");
    for (const name of [/^Scenari/, /^Review/, "Storico"]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
  });

  it("renders the lifecycle progress strip under the header", () => {
    render(<FeatureDetailPage />);
    expect(screen.getByRole("list", { name: "Avanzamento della feature" })).toBeInTheDocument();
  });

  it("creates one scenario on a double Enter", async () => {
    mocks.addScenario.mockImplementation(() => new Promise(() => {}));
    render(<FeatureDetailPage />);
    await userEvent.type(screen.getByLabelText("Titolo nuovo scenario"), "Nuovo{Enter}{Enter}");
    expect(mocks.addScenario).toHaveBeenCalledTimes(1);
  });
});


describe("FeatureDetailPage rebase", () => {
  it("opens the rebase dialog from 'Riallinea' and applies with the current lock", async () => {
    const working = FEATURE.working_revision!;
    working.base_stale = true;
    mocks.applyRebase.mockResolvedValue({});
    mocks.rebaseView = {
      revision_id: working.id, base_revision_id: "r0", published_revision_id: "r9",
      lock_version: working.lock_version, metadata: [],
      scenarios: [{
        scenario_id: "sc1", tag: "@FDR3_001_01", conflict: true,
        base: { position: 1, title: "a", kind: "scenario", polarity: "positivo", extra_tags: [], steps: "Dato a", examples: null, detail_link: null },
        git: { position: 1, title: "a", kind: "scenario", polarity: "positivo", extra_tags: [], steps: "Dato b", examples: null, detail_link: null },
        draft: { position: 1, title: "a", kind: "scenario", polarity: "positivo", extra_tags: [], steps: "Dato c", examples: null, detail_link: null },
      }],
    };
    try {
      render(<FeatureDetailPage />);
      expect(screen.getByText("Base superata")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Riallinea" }));
      await userEvent.click(await screen.findByRole("radio", { name: /Usa Git.*@FDR3_001_01/ }));
      await userEvent.click(screen.getByRole("button", { name: "Applica" }));
      await waitFor(() =>
        expect(mocks.applyRebase).toHaveBeenCalledWith({
          featureId: FEATURE.id,
          revisionId: working.id,
          lockVersion: working.lock_version,
          choices: { sc1: "git" },
        }),
      );
      expect(mocks.refetch).toHaveBeenCalled();
    } finally {
      working.base_stale = false;
    }
  });
});

describe("FeatureDetailPage delete", () => {
  beforeEach(() => mocks.push.mockReset());

  it("Elimina opens the dialog and navigates to the list after deletion", async () => {
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    expect(screen.getByTestId("delete-dialog")).toHaveTextContent("feature:f1");
    await userEvent.click(screen.getByRole("button", { name: "confirm-delete" }));
    expect(mocks.push).toHaveBeenCalledWith("/test-lifecycle");
  });

  it("metadata labels use the mono label style", () => {
    render(<FeatureDetailPage />);
    expect(screen.getByText("Titolo").closest("label")!.className).toContain("font-mono");
  });
});
