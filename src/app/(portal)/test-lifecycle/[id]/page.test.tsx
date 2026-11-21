import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { STALE_LOCK_MESSAGE } from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlScenario } from "@/types/test-lifecycle";
import FeatureDetailPage from "./page";

const mocks = vi.hoisted(() => ({
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

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "f1" }) }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: { user: { email: "a@x.it" } } }),
}));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock("@/hooks/useUsers", () => ({ useUsers: () => ({ data: { items: [] } }) }));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlStepSuggestions: () => ({ data: [] }),
  useTlFeature: () => ({ data: FEATURE, isLoading: false, isError: false, refetch: mocks.refetch }),
  useTlTransition: () => ({ mutateAsync: mocks.transition, isPending: false }),
  useUpdateTlRevision: () => ({ mutateAsync: mocks.updateRevision }),
  useUpdateTlScenario: () => ({ mutateAsync: mocks.updateScenario }),
  useAddTlScenario: () => ({ mutateAsync: mocks.addScenario }),
  useRemoveTlScenario: () => ({ mutateAsync: mocks.removeScenario }),
  useUpdateTlFeature: () => ({ mutate: vi.fn() }),
  useValidateSteps: () => ({ mutate: mocks.validate }),
  useTlComments: () => ({
    data: [{ id: "c1", revision_id: "r1", scenario_id: "sc1", scenario_tag: "@FDR3_001_01", author: "a", body: "x", resolved: false, created_at: "2026-11-20T10:00:00Z" }],
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
  id: "f1", code: "FEAT_001_FdR3", number: 1, status: "draft", scope_id: "s1", scope_code: "FdR3",
  design_owner_id: null, reviewer_id: null, impl_owner_id: null, jira_design_key: null,
  jira_impl_key: null, created_by: "a@x.it", created_at: "", updated_at: "",
  working_revision: {
    id: "r1", number: 1, status: "draft", lock_version: 3, title: "Pagamento avviso",
    description: null, background_steps: null, requirements_url: null, product_issue_key: null,
    reverse_engineering: false, design_estimate_days: null, impl_estimate_days: null,
    created_by: "a@x.it", approved_by: null, approved_at: null, created_at: "", updated_at: "",
    scenarios: [sc("sc1", 1, "Primo"), sc("sc2", 2, "Secondo")], background_errors: [], origin: "hub", pr_number: null, pr_url: null, pr_state: null, pr_error: null, base_stale: false, merged_commit_sha: null,
  },
  published_revision: null,
  git_path: null,
  open_issues: 0,
  jira: [], jira_error: null, jira_qa_epic_key: null, jira_qa_epic_effective: null,
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

  it("keeps unsaved scenario text when switching tabs", async () => {
    render(<FeatureDetailPage />);
    await userEvent.type(titles()[0], " in corso");
    await userEvent.click(screen.getByRole("tab", { name: "Anteprima file" }));
    expect(await screen.findByText("# qa-hub: FEAT_001_FdR3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Scenari" }));
    expect(titles()[0]).toHaveValue("Primo in corso");
  });

  it("lists tabs in order and jumps to Review with the scenario preselected", async () => {
    render(<FeatureDetailPage />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Scenari", "Review", "Storico", "Git", "Anteprima file",
    ]);
    await userEvent.click(screen.getAllByRole("button", { name: /Commenta/ })[0]);
    expect(await screen.findByLabelText("Scenario")).toHaveValue("sc1");
  });

  it("keeps the unsent comment draft when switching tabs", async () => {
    render(<FeatureDetailPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Review" }));
    await userEvent.type(screen.getByLabelText("Nuovo commento"), "bozza commento");
    await userEvent.click(screen.getByRole("tab", { name: "Scenari" }));
    await userEvent.click(screen.getByRole("tab", { name: "Review" }));
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
