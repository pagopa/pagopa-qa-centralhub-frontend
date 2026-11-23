import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlComment, TlRevision, TlScenario } from "@/types/test-lifecycle";
import { ReviewPanel } from "./ReviewPanel";

const mocks = vi.hoisted(() => ({
  comments: [] as unknown[],
  add: vi.fn(),
  resolve: vi.fn(),
  perms: new Set<string>(),
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlComments: () => ({ data: mocks.comments, isLoading: false, isError: false }),
  useAddTlComment: () => ({ mutateAsync: mocks.add, isPending: false }),
  useResolveTlComment: () => ({ mutateAsync: mocks.resolve, isPending: false }),
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (a: string) => mocks.perms.has(a) }),
}));

const SCENARIOS = [
  { id: "sc1", number: 1, tag: "@FDR3_001_01", position: 0, title: "Pagamento ok" },
  { id: "sc2", number: 2, tag: "@FDR3_001_02", position: 1, title: "Pagamento ko" },
] as TlScenario[];

const REVISION = { id: "r1", status: "in_review", scenarios: SCENARIOS } as TlRevision;

function comment(o: Partial<TlComment> = {}): TlComment {
  return {
    id: "c1", revision_id: "r1", scenario_id: "sc1", scenario_tag: "@FDR3_001_01",
    author: "rev@x.it", body: "Manca il caso limite", resolved: false,
    created_at: "2026-11-20T10:00:00Z", ...o,
  };
}

function renderPanel(props: Partial<Parameters<typeof ReviewPanel>[0]> = {}) {
  return render(
    <ReviewPanel
      featureId="f1"
      revision={props.revision ?? REVISION}
      selectedScenarioId={props.selectedScenarioId ?? null}
      onSelectScenario={props.onSelectScenario ?? vi.fn()}
      sessionReady={props.sessionReady ?? true}
    />,
  );
}

describe("ReviewPanel", () => {
  beforeEach(() => {
    mocks.comments = [];
    mocks.add.mockReset().mockResolvedValue({});
    mocks.resolve.mockReset().mockResolvedValue({});
    mocks.perms = new Set(["review:tl_feature"]);
  });

  it("adds a comment bound to the selected scenario", async () => {
    renderPanel({ selectedScenarioId: "sc2" });
    await userEvent.type(screen.getByLabelText("Nuovo commento"), "Serve un controllo");
    await userEvent.click(screen.getByRole("button", { name: "Aggiungi commento" }));
    expect(mocks.add).toHaveBeenCalledWith({
      featureId: "f1", revisionId: "r1", body: "Serve un controllo", scenario_id: "sc2",
    });
  });

  it("adds a general comment when no scenario is selected", async () => {
    renderPanel();
    await userEvent.type(screen.getByLabelText("Nuovo commento"), "Generale");
    await userEvent.click(screen.getByRole("button", { name: "Aggiungi commento" }));
    expect(mocks.add).toHaveBeenCalledWith({
      featureId: "f1", revisionId: "r1", body: "Generale", scenario_id: null,
    });
  });

  it("resolves an open comment", async () => {
    mocks.comments = [comment()];
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Segna come risolto" }));
    expect(mocks.resolve).toHaveBeenCalledWith({
      commentId: "c1", resolved: true, featureId: "f1", revisionId: "r1",
    });
  });

  it("reopens a resolved comment", async () => {
    mocks.comments = [comment({ resolved: true })];
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Riapri" }));
    expect(mocks.resolve).toHaveBeenCalledWith({
      commentId: "c1", resolved: false, featureId: "f1", revisionId: "r1",
    });
  });

  it("renders comment bodies as text, never as HTML", () => {
    mocks.comments = [comment({ body: "<b>grassetto</b>" })];
    renderPanel();
    expect(screen.getByText("<b>grassetto</b>")).toBeInTheDocument();
  });

  it("hides the add form when the revision is not commentable", () => {
    renderPanel({ revision: { ...REVISION, status: "approved" } as TlRevision });
    expect(screen.queryByLabelText("Nuovo commento")).not.toBeInTheDocument();
    expect(screen.getByText(/non sono ammessi nuovi commenti/i)).toBeInTheDocument();
  });

  it("hides write actions without permission", () => {
    mocks.perms = new Set();
    mocks.comments = [comment()];
    renderPanel();
    expect(screen.queryByLabelText("Nuovo commento")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Segna come risolto" })).not.toBeInTheDocument();
  });

  it("disables write actions while the session loads", () => {
    mocks.comments = [comment()];
    renderPanel({ sessionReady: false });
    expect(screen.getByRole("button", { name: "Segna come risolto" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Aggiungi commento" })).toBeDisabled();
  });

  it("shows the API error and keeps the text when adding fails", async () => {
    mocks.add.mockRejectedValue(new ApiError(409, { detail: { code: "revision_not_commentable", message: "Revisione non commentabile" } }));
    renderPanel();
    await userEvent.type(screen.getByLabelText("Nuovo commento"), "Testo");
    await userEvent.click(screen.getByRole("button", { name: "Aggiungi commento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Revisione non commentabile");
    expect(screen.getByLabelText("Nuovo commento")).toHaveValue("Testo");
  });

  it("filters the list by the selected scenario", () => {
    mocks.comments = [comment(), comment({ id: "c2", scenario_id: "sc2", scenario_tag: "@FDR3_001_02", body: "Altro" })];
    renderPanel({ selectedScenarioId: "sc2" });
    const list = screen.getByRole("list", { name: "Commenti" });
    expect(within(list).queryByText("Manca il caso limite")).not.toBeInTheDocument();
    expect(within(list).getByText("Altro")).toBeInTheDocument();
  });
});
