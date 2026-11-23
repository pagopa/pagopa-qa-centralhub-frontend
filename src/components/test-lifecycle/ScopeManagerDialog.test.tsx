import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlScope } from "@/types/test-lifecycle";
import { ScopeManagerDialog } from "./ScopeManagerDialog";

const SCOPES: TlScope[] = [
  {
    id: "s1", code: "FdR3", name: "Fondo rischi", area: "Core", repo_folder: null, owner_team: null,
    next_feature_number: 3, created_at: "", updated_at: "", feature_count: 2, status_counts: {}, jira_qa_epic_key: null, jira_component: null,
  },
  {
    id: "s2", code: "Vuoto", name: "Senza feature", area: null, repo_folder: null, owner_team: null,
    next_feature_number: 1, created_at: "", updated_at: "", feature_count: 0, status_counts: {}, jira_qa_epic_key: null, jira_component: null,
  },
];

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  createEpic: vi.fn(),
  epicsQuery: vi.fn(),
  updateError: null as unknown,
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlScopes: () => ({ data: SCOPES, isLoading: false }),
  useCreateTlScope: () => ({ mutate: mocks.create, reset: vi.fn(), isPending: false, error: null }),
  useUpdateTlScope: () => ({ mutate: mocks.update, reset: vi.fn(), isPending: false, error: mocks.updateError }),
  useCreateTlScopeEpic: () => ({ mutateAsync: mocks.createEpic, isPending: false }),
  useTlJiraEpics: (q: string, enabled: boolean) => {
    mocks.epicsQuery(q, enabled);
    return {
      data: enabled ? [{ role: "qa_epic", key: "PQ-495", summary: "[QA Epic] Fondo rischi", verified: true }] : undefined,
      isFetching: false,
      isError: false,
    };
  },
}));

beforeEach(() => {
  mocks.create.mockReset();
  mocks.update.mockReset();
  mocks.createEpic.mockReset();
  mocks.epicsQuery.mockReset();
  mocks.updateError = null;
});

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

  it("sends the Jira epic and component when creating a scope", async () => {
    render(<ScopeManagerDialog open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Nuovo ambito" }));
    await userEvent.type(screen.getByLabelText("Codice"), "Pag");
    await userEvent.type(screen.getByLabelText("Nome"), "Pagamenti");
    await userEvent.type(screen.getByLabelText("Epic QA"), "PQ-10");
    await userEvent.type(screen.getByLabelText("Componente Jira"), "PAGAMENTI");
    await userEvent.click(screen.getByRole("button", { name: "Salva" }));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: "Pag", jira_qa_epic_key: "PQ-10", jira_component: "PAGAMENTI" }),
      expect.anything(),
    );
    expect(screen.queryByRole("button", { name: "Crea Epic QA" })).toBeNull(); // ambito non ancora salvato
  });

  it("picks an existing epic from the search and saves its key", async () => {
    render(<ScopeManagerDialog open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Modifica ambito FdR3" }));
    await userEvent.type(screen.getByLabelText("Epic QA"), "Fondo");
    await waitFor(() => expect(mocks.epicsQuery).toHaveBeenCalledWith("Fondo", true));
    await userEvent.click(await screen.findByRole("option", { name: /PQ-495/ }));
    expect(screen.getByLabelText("Epic QA")).toHaveValue("PQ-495");
    await userEvent.click(screen.getByRole("button", { name: "Salva" }));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1", jira_qa_epic_key: "PQ-495" }),
      expect.anything(),
    );
  });

  it("creates the QA epic on Jira and fills the field", async () => {
    mocks.createEpic.mockResolvedValue({ ...SCOPES[0], jira_qa_epic_key: "PQ-9001" });
    render(<ScopeManagerDialog open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Modifica ambito FdR3" }));
    await userEvent.click(screen.getByRole("button", { name: "Crea Epic QA" }));
    expect(mocks.createEpic).toHaveBeenCalledWith({ scopeId: "s1" });
    expect(screen.getByLabelText("Epic QA")).toHaveValue("PQ-9001");
    expect(screen.getByText("Epic PQ-9001 creata su Jira")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crea Epic QA" })).toBeNull();
  });

  it("shows the not-an-epic error next to the field", async () => {
    mocks.updateError = new ApiError(422, {
      detail: { code: "jira_not_an_epic", message: "PQ-12 non è un'Epic" },
    });
    render(<ScopeManagerDialog open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Modifica ambito FdR3" }));
    expect(screen.getByLabelText("Epic QA")).toHaveAccessibleDescription("PQ-12 non è un'Epic");
  });
});
