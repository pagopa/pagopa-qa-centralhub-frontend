import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlDeletePreview } from "@/types/test-lifecycle";
import { TlDeleteDialog } from "./TlDeleteDialog";

const mocks = vi.hoisted(() => ({
  preview: { data: undefined, isLoading: false, error: null } as {
    data: TlDeletePreview | undefined;
    isLoading: boolean;
    error: unknown;
  },
  mutateAsync: vi.fn(),
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlDeletePreview: () => mocks.preview,
  useTlDelete: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

const PREVIEW: TlDeletePreview = {
  deletable: true,
  blockers: [],
  features: [{ id: "f1", code: "FEAT_001_FdR3", title: "Pagamento" }],
  scenario_count: 3,
  jira_issues: [
    { key: "PQ-1", role: "design", summary: "Progettazione", status: "Backlog", url: "https://jira/PQ-1", feature_code: "FEAT_001_FdR3", default_selected: true },
    { key: "PQ-2", role: "impl", summary: "Implementazione", status: "Backlog", url: null, feature_code: "FEAT_001_FdR3", default_selected: true },
    { key: "PQ-90", role: "qa_epic", summary: "Epic QA", status: "In corso", url: null, feature_code: null, default_selected: false },
  ],
};

const TARGET = { kind: "scope" as const, id: "s1", label: "FdR3" };

function renderDialog(onClose = vi.fn(), onDeleted = vi.fn()) {
  render(<TlDeleteDialog target={TARGET} onClose={onClose} onDeleted={onDeleted} />);
  return { onClose, onDeleted };
}

beforeEach(() => {
  mocks.preview = { data: PREVIEW, isLoading: false, error: null };
  mocks.mutateAsync.mockReset();
});

describe("TlDeleteDialog", () => {
  it("shows blockers and disables Elimina when not deletable", () => {
    mocks.preview = {
      data: {
        ...PREVIEW,
        deletable: false,
        blockers: [{ feature_id: "f1", code: "FEAT_001_FdR3", reason: "published" }],
      },
      isLoading: false,
      error: null,
    };
    renderDialog();
    expect(screen.getByText(/pubblicata su Git/)).toHaveTextContent("FEAT_001_FdR3");
    expect(screen.getByRole("button", { name: "Elimina" })).toBeDisabled();
  });

  it("preselects design and impl issues but not the epic", () => {
    renderDialog();
    expect(screen.getByRole("checkbox", { name: /PQ-1/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /PQ-2/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /PQ-90/ })).not.toBeChecked();
  });

  it("sends only the checked keys when confirming", async () => {
    mocks.mutateAsync.mockResolvedValue({ deleted_features: 1, jira_results: [{ key: "PQ-1", status: "deleted", reason: null }] });
    const { onClose, onDeleted } = renderDialog();
    await userEvent.click(screen.getByRole("checkbox", { name: /PQ-2/ }));
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ id: "s1", deleteJiraKeys: ["PQ-1"] }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onDeleted).toHaveBeenCalled();
  });

  it("sends an empty key list when everything is unchecked", async () => {
    mocks.mutateAsync.mockResolvedValue({ deleted_features: 1, jira_results: [] });
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Nessuna" }));
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ id: "s1", deleteJiraKeys: [] }));
  });

  it("Seleziona tutte and Nessuna toggle every box", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Seleziona tutte" }));
    expect(screen.getAllByRole("checkbox").every((c) => (c as HTMLInputElement).checked)).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Nessuna" }));
    expect(screen.getAllByRole("checkbox").every((c) => !(c as HTMLInputElement).checked)).toBe(true);
  });

  it("stays open and lists failed keys on partial Jira failure", async () => {
    mocks.mutateAsync.mockResolvedValue({
      deleted_features: 1,
      jira_results: [
        { key: "PQ-1", status: "failed", reason: "forbidden" },
        { key: "PQ-2", status: "deleted", reason: null },
      ],
    });
    const { onClose, onDeleted } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    expect(await screen.findByText(/forbidden/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(onDeleted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the backend error when the delete fails", async () => {
    mocks.mutateAsync.mockRejectedValue(
      new ApiError(409, { detail: { code: "feature_not_deletable", message: "La feature non può essere eliminata" } }),
    );
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La feature non può essere eliminata");
  });

  it("shows an error and disables Elimina when the preview fails", () => {
    mocks.preview = { data: undefined, isLoading: false, error: new ApiError(404, { detail: "Ambito non trovato" }) };
    renderDialog();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elimina" })).toBeDisabled();
  });

  it("reports the deletion when the results view is dismissed with Escape", async () => {
    mocks.mutateAsync.mockResolvedValue({
      deleted_features: 1,
      jira_results: [{ key: "PQ-1", status: "failed", reason: "forbidden" }],
    });
    const { onClose, onDeleted } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    await screen.findByText(/forbidden/);
    await userEvent.keyboard("{Escape}");
    expect(onDeleted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
