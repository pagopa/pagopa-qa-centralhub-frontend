import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { MoveFeaturesDialog } from "./MoveFeaturesDialog";

const mocks = vi.hoisted(() => ({ move: vi.fn(), pending: false }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlScopes: () => ({
    data: [
      { id: "s1", code: "NodoInviaCarrelloRPT", name: "DISM. WISP" },
      { id: "s2", code: "WISP", name: "Dismissione WISP" },
      { id: "s3", code: "FdR3", name: "Fondo rischi" },
    ],
  }),
  useMoveTlFeatures: () => ({ mutateAsync: mocks.move, isPending: mocks.pending }),
}));

const FEATURES = [
  { id: "f1", code: "FEAT_004_NodoInviaCarrelloRPT" },
  { id: "f2", code: "FEAT_005_NodoInviaCarrelloRPT" },
];

function setup(props: Partial<Parameters<typeof MoveFeaturesDialog>[0]> = {}) {
  const handlers = { onClose: vi.fn(), onMoved: vi.fn() };
  render(<MoveFeaturesDialog open features={FEATURES} currentScopeIds={["s1"]} {...handlers} {...props} />);
  return handlers;
}

const RESULT = {
  moved: [
    { feature_id: "f1", old_code: "FEAT_004_NodoInviaCarrelloRPT", new_code: "FEAT_012_WISP", old_scope_code: "NodoInviaCarrelloRPT", new_scope_code: "WISP" },
    { feature_id: "f2", old_code: "FEAT_005_NodoInviaCarrelloRPT", new_code: "FEAT_013_WISP", old_scope_code: "NodoInviaCarrelloRPT", new_scope_code: "WISP" },
  ],
  skipped: [],
  alignment_error: null,
};

describe("MoveFeaturesDialog", () => {
  beforeEach(() => {
    mocks.move.mockReset().mockResolvedValue(RESULT);
    mocks.pending = false;
  });

  it("lists the scopes by name, without the one the features are already in", () => {
    setup();
    const options = within(screen.getByLabelText("Ambito di arrivo")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Seleziona un ambito…", "Dismissione WISP (WISP)", "Fondo rischi (FdR3)"]);
  });

  it("names the features being moved", () => {
    setup();
    expect(screen.getByRole("dialog")).toHaveTextContent("FEAT_004_NodoInviaCarrelloRPT");
    expect(screen.getByRole("dialog")).toHaveTextContent("FEAT_005_NodoInviaCarrelloRPT");
  });

  it("explains what changes and what does not", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/codice, numero e tag degli scenari/i);
    expect(dialog).toHaveTextContent(/Epic QA/);
    expect(dialog).toHaveTextContent(/task Jira già creati/i);
  });

  it("shows a spinner and 'Spostamento…' while the features are being moved", async () => {
    mocks.pending = true;
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Ambito di arrivo"), "s2");
    const button = screen.getByRole("button", { name: "Spostamento…" });
    expect(button).toBeDisabled();
    expect(button.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("cannot be confirmed before a target scope is chosen", () => {
    setup();
    expect(screen.getByRole("button", { name: "Sposta" })).toBeDisabled();
  });

  it("moves with the ids and the target", async () => {
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Ambito di arrivo"), "s2");
    await userEvent.click(screen.getByRole("button", { name: "Sposta" }));
    expect(mocks.move).toHaveBeenCalledWith({ featureIds: ["f1", "f2"], targetScopeId: "s2" });
  });

  it("shows the new codes and tells the page when it is closed", async () => {
    const h = setup();
    await userEvent.selectOptions(screen.getByLabelText("Ambito di arrivo"), "s2");
    await userEvent.click(screen.getByRole("button", { name: "Sposta" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveTextContent("FEAT_012_WISP"));
    expect(dialog).toHaveTextContent("FEAT_013_WISP");
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(h.onMoved).toHaveBeenCalledTimes(1);
  });

  it("reports a problem with the migration pull requests without hiding the result", async () => {
    mocks.move.mockResolvedValue({ ...RESULT, alignment_error: "PR di allineamento WISP: GitHub giù" });
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Ambito di arrivo"), "s2");
    await userEvent.click(screen.getByRole("button", { name: "Sposta" }));
    expect(await screen.findByText(/GitHub giù/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("FEAT_012_WISP");
  });

  it("lists the blocking features and does not move", async () => {
    mocks.move.mockRejectedValueOnce(
      new ApiError(409, {
        detail: {
          code: "adapt_blocked",
          message: "Alcune feature non si possono adeguare",
          blocked: [{ feature_id: "f2", code: "FEAT_005_NodoInviaCarrelloRPT", reasons: ["Il file è già su main con i codici e i tag dell'hub"] }],
        },
      }),
    );
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Ambito di arrivo"), "s2");
    await userEvent.click(screen.getByRole("button", { name: "Sposta" }));
    const list = await screen.findByRole("list", { name: "Feature che non si possono adeguare" });
    expect(list).toHaveTextContent("FEAT_005_NodoInviaCarrelloRPT");
    expect(list).toHaveTextContent("Il file è già su main");
    expect(screen.queryByRole("button", { name: "Sposta senza adeguare" })).not.toBeInTheDocument();
  });

  it("shows any other error", async () => {
    mocks.move.mockRejectedValueOnce(new ApiError(409, { detail: { code: "migration_in_progress", message: "Una migrazione è in corso: riprova tra poco" } }));
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Ambito di arrivo"), "s2");
    await userEvent.click(screen.getByRole("button", { name: "Sposta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Una migrazione è in corso");
  });
});
