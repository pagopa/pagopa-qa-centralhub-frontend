import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureFilters } from "@/types/test-lifecycle";
import TestLifecyclePage from "./page";

const mocks = vi.hoisted(() => ({ useTlFeatures: vi.fn() }));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "a@x.it" } }, status: "authenticated" }),
}));
vi.mock("@/components/test-lifecycle/TlDeleteDialog", () => ({
  TlDeleteDialog: ({
    target,
    onDeleted,
    onClose,
  }: {
    target: { kind: string; id: string; label: string } | null;
    onDeleted?: () => void;
    onClose: () => void;
  }) =>
    target ? (
      <div data-testid="delete-dialog">
        {`${target.kind}:${target.id}`}
        <button onClick={() => { onDeleted?.(); onClose(); }}>confirm-delete</button>
      </div>
    ) : null,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true, role: "qa_manager", isLoading: false }),
}));
vi.mock("@/hooks/useUsers", () => ({
  useUsers: () => ({ data: { items: [{ id: "u1", email: "a@x.it", name: "Anna" }] } }),
}));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlFeatures: mocks.useTlFeatures,
  useMoveTlFeatures: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTlScopes: () => ({
    data: [
      { id: "s1", code: "FdR3", name: "Fondo rischi", area: "Core", feature_count: 1, status_counts: {}, deletable: true },
      { id: "s2", code: "Pay", name: "Pagamenti", area: "Core", feature_count: 0, status_counts: {}, deletable: true },
    ],
    isLoading: false,
  }),
  useCreateTlScope: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useUpdateTlScope: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useCreateTlScopeEpic: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTlJiraEpics: () => ({ data: undefined, isFetching: false, isError: false }),
  useCreateTlFeature: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useTlIssues: () => ({ data: [], isLoading: false, isError: false }),
  useTlGitStatus: () => ({ data: { configured: false }, isLoading: false }),
  useTlGitSync: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("TestLifecyclePage", () => {
  beforeEach(() => {
    mocks.useTlFeatures.mockReset();
    mocks.useTlFeatures.mockReturnValue({ data: [], isLoading: false });
  });

  it("card click sets the scope filter without clearing the status filter", async () => {
    render(<TestLifecyclePage />);
    await userEvent.selectOptions(screen.getByLabelText("Stato"), "draft");
    await userEvent.click(screen.getByRole("button", { name: /^Fondo rischi/ }));
    expect(mocks.useTlFeatures).toHaveBeenLastCalledWith({
      status: "draft",
      scope_id: "s1",
    } satisfies TlFeatureFilters);
    expect(screen.getByLabelText("Stato")).toHaveValue("draft");
    expect(screen.getByLabelText("Ambito")).toHaveValue("s1");
  });

  it("dialog opened after selecting a scope pre-selects it", async () => {
    render(<TestLifecyclePage />);
    await userEvent.click(screen.getByRole("button", { name: /^Fondo rischi/ }));
    await userEvent.click(screen.getByRole("button", { name: /Nuova feature/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("select")).toHaveValue("s1");
  });
});

describe("TestLifecyclePage scope actions", () => {
  beforeEach(() => {
    mocks.useTlFeatures.mockReset();
    mocks.useTlFeatures.mockReturnValue({ data: [], isLoading: false });
  });

  it("deleting the selected scope clears the scope filter", async () => {
    render(<TestLifecyclePage />);
    await userEvent.click(screen.getByRole("button", { name: /^Fondo rischi/ }));
    expect(screen.getByLabelText("Ambito")).toHaveValue("s1");
    await userEvent.click(screen.getByRole("button", { name: "Elimina ambito FdR3" }));
    expect(screen.getByTestId("delete-dialog")).toHaveTextContent("scope:s1");
    await userEvent.click(screen.getByRole("button", { name: "confirm-delete" }));
    expect(screen.getByLabelText("Ambito")).toHaveValue("");
  });

  it("the scope manager lists a delete icon per scope", async () => {
    render(<TestLifecyclePage />);
    await userEvent.click(screen.getByRole("button", { name: /Gestisci ambiti/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Elimina ambito Pay" })).toBeInTheDocument();
  });

  it("the card edit icon opens the manager on that scope", async () => {
    render(<TestLifecyclePage />);
    fireEvent.click(screen.getByRole("button", { name: "Modifica ambito Pay" }));
    // "Pay" has no features, so the (slow in jsdom) locked-code tooltip is not rendered.
    expect(await screen.findByText("Modifica ambito Pay", { selector: "[data-slot='dialog-title']" })).toBeInTheDocument();
  });

  it("styles Nuova feature as the primary action", () => {
    render(<TestLifecyclePage />);
    expect(screen.getByRole("button", { name: /Nuova feature/ }).className).toContain("bg-accent");
  });
});

describe("TestLifecyclePage guide link", () => {
  it("links the guide from the header", () => {
    render(<TestLifecyclePage />);
    expect(screen.getByRole("link", { name: /Guida/ })).toHaveAttribute("href", "/test-lifecycle/guida");
  });
});
