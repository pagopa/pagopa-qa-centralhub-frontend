import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlScenario } from "@/types/test-lifecycle";
import { ScenarioCard } from "./ScenarioCard";

const mocks = vi.hoisted(() => ({ validate: vi.fn() }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlCategoryTags: () => ({ data: undefined }),
  useTlStepSuggestions: () => ({ data: [] }),
  useValidateSteps: () => ({ mutate: mocks.validate }),
}));

function scenario(overrides: Partial<TlScenario> = {}): TlScenario {
  return {
    id: "sc1", number: 2, tag: "@FDR3_001_02", position: 1, title: "Pagamento ok",
    kind: "scenario", polarity: "positivo", extra_tags: [],
    steps: "Dato un avviso\nQuando pago\nAllora ricevo la ricevuta",
    examples: null, detail_link: null, errors: [],
    ...overrides,
  };
}

function renderCard(props: Partial<Parameters<typeof ScenarioCard>[0]> = {}) {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
  render(
    <ScenarioCard
      scenario={props.scenario ?? scenario()}
      readOnly={props.readOnly ?? false}
      stale={props.stale ?? false}
      onSave={onSave}
    />,
  );
  return { onSave };
}

describe("ScenarioCard", () => {
  beforeEach(() => mocks.validate.mockReset());
  afterEach(() => vi.useRealTimers());

  it("shows 'Modifiche non salvate' while the text differs from the saved one", async () => {
    const { onSave } = renderCard();
    expect(screen.queryByText("Modifiche non salvate")).toBeNull();
    await userEvent.type(screen.getByLabelText("Titolo scenario"), " bis");
    expect(screen.getByText("Modifiche non salvate")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salva" }));
    expect(onSave).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Modifiche non salvate")).toBeNull());
  });

  it("shows no unsaved badge when read-only", () => {
    renderCard({ readOnly: true });
    expect(screen.queryByText("Modifiche non salvate")).toBeNull();
  });

  it("links the saved detail only when it is an http(s) URL", () => {
    renderCard({ readOnly: true, scenario: scenario({ detail_link: "https://docs.example.test/req#3" }) });
    expect(screen.getByRole("link", { name: "https://docs.example.test/req#3" })).toHaveAttribute(
      "href",
      "https://docs.example.test/req#3",
    );
  });

  it("shows a non-http detail as plain text", () => {
    renderCard({ readOnly: true, scenario: scenario({ detail_link: "javascript:alert(1)" }) });
    expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the identity tag and number read-only", () => {
    renderCard();
    expect(screen.getByText("@FDR3_001_02")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("@FDR3_001_02")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Titolo scenario")).toHaveValue("Pagamento ok");
  });

  it("shows the errors at the reported line", () => {
    renderCard({ scenario: scenario({ errors: [{ line: 2, message: "Step non valido" }] }) });
    expect(screen.getByTestId("steps-line-2")).toHaveAttribute("data-error", "true");
    expect(screen.getByTestId("steps-line-1")).toHaveAttribute("data-error", "false");
    expect(screen.getByText("Riga 2: Step non valido")).toBeInTheDocument();
  });

  it("hides Esempi for a plain scenario and shows them for an outline", () => {
    renderCard();
    expect(screen.queryByText("Esempi")).not.toBeInTheDocument();
  });

  it("shows Esempi for an outline", () => {
    renderCard({
      scenario: scenario({ kind: "outline", examples: { headers: ["importo"], rows: [["10"]] } }),
    });
    expect(screen.getByText("Esempi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("importo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  it("keeps the local text on a stale lock 409 and leaves the banner to the page", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValue(new ApiError(409, { detail: { code: "stale_lock", message: "x" } }));
    renderCard({ onSave });
    const title = screen.getByLabelText("Titolo scenario");
    await userEvent.clear(title);
    await userEvent.type(title, "Titolo nuovo");
    await userEvent.click(screen.getByRole("button", { name: "Salva" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: "Titolo nuovo" }));
    expect(screen.getByLabelText("Titolo scenario")).toHaveValue("Titolo nuovo");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sends one PATCH when blur and Salva fire together", async () => {
    let resolve: () => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    renderCard({ onSave });
    await userEvent.type(screen.getByLabelText("Titolo scenario"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Salva" }));
    await act(async () => resolve());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("suppresses saves while the draft is stale", async () => {
    const { onSave } = renderCard({ stale: true });
    await userEvent.type(screen.getByLabelText("Titolo scenario"), "x");
    expect(screen.getByRole("button", { name: "Salva" })).toBeDisabled();
    await userEvent.tab();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("validates the steps after 400 ms of inactivity", () => {
    vi.useFakeTimers();
    renderCard();
    fireEvent.change(screen.getByLabelText("Step"), { target: { value: "Dato x" } });
    act(() => vi.advanceTimersByTime(399));
    expect(mocks.validate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(mocks.validate).toHaveBeenCalledWith(
      expect.objectContaining({ steps: "Dato x", kind: "scenario" }),
      expect.anything(),
    );
  });

  it("clears stale errors and shows a message when live validation fails", () => {
    vi.useFakeTimers();
    mocks.validate.mockImplementation(
      (_req: unknown, opts?: { onError?: (e: unknown) => void }) =>
        opts?.onError?.(new ApiError(422, { detail: [{ msg: "Value error, Esempi non validi" }] })),
    );
    renderCard({ scenario: scenario({ errors: [{ line: 2, message: "Step non valido" }] }) });
    expect(screen.getByText("Riga 2: Step non valido")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Step"), { target: { value: "Dato x" } });
    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByText("Riga 2: Step non valido")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Esempi non validi");
  });

  describe("identity and segmented controls", () => {
    it("marks the card with its polarity and writes it as text", () => {
      renderCard({ scenario: scenario({ polarity: "negativo" }) });
      expect(document.getElementById("scenario-sc1")).toHaveAttribute("data-polarity", "negativo");
      expect(screen.getByTestId("scenario-polarity")).toHaveTextContent("Negativo");
    });

    it("changes the polarity from the segmented control and saves", async () => {
      const { onSave } = renderCard();
      await userEvent.click(screen.getByRole("radio", { name: "Negativo" }));
      await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ polarity: "negativo" })));
      expect(document.getElementById("scenario-sc1")).toHaveAttribute("data-polarity", "negativo");
    });

    it("switching Tipo to the outline shows the examples and saves", async () => {
      const { onSave } = renderCard();
      expect(screen.queryByText("Esempi")).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("radio", { name: "Schema dello scenario" }));
      expect(screen.getByText("Esempi")).toBeInTheDocument();
      await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ kind: "outline" })));
    });

    it("does not clip the step suggestions popup: the card has no overflow-hidden", () => {
      // The popup is absolutely positioned below the steps block and can be taller than what is left
      // under it inside the card: clipping the card would hide its lower rows.
      renderCard();
      const card = document.getElementById("scenario-sc1")!;
      expect(card.className).not.toContain("overflow-hidden");
    });

    it("renders plain chips with the selected values and no radios when read-only", () => {
      renderCard({ readOnly: true, scenario: scenario({ kind: "outline", polarity: "negativo", examples: { headers: ["a"], rows: [["1"]] } }) });
      expect(screen.queryAllByRole("radio")).toHaveLength(0);
      expect(screen.getByRole("group", { name: "Tipo" })).toHaveTextContent("Schema dello scenario");
      expect(screen.getByRole("group", { name: "Polarità" })).toHaveTextContent("Negativo");
    });

    it("adding a tag keeps the custom tags the scenario already has and saves them all", async () => {
      const { onSave } = renderCard({ scenario: scenario({ extra_tags: ["runnable", "smoke", "checkout"] }) });
      await userEvent.type(screen.getByLabelText("Nuovo tag"), "regression{Enter}");
      expect(onSave).toHaveBeenCalledWith({ extra_tags: ["runnable", "smoke", "checkout", "regression"] });
    });

    it("disables the extra tags too when the draft is stale", () => {
      renderCard({ stale: true });
      const boxes = screen.getAllByRole("checkbox");
      expect(boxes.length).toBeGreaterThan(0);
      for (const box of boxes) expect(box).toBeDisabled();
    });

    it("disables the controls when the draft is stale", () => {
      renderCard({ stale: true });
      for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    });
  });

  it("is fully read-only when readOnly", () => {
    renderCard({ readOnly: true });
    expect(screen.getByLabelText("Titolo scenario")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Step")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Salva" })).not.toBeInTheDocument();
  });

  it("shows the open comments badge and jumps to review on 'Commenta'", async () => {
    const onComment = vi.fn();
    render(
      <ScenarioCard scenario={scenario()} readOnly={false} onSave={vi.fn()} openComments={3} onComment={onComment} />,
    );
    expect(screen.getByLabelText("3 commenti aperti")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Commenta/ }));
    expect(onComment).toHaveBeenCalled();
  });

  it("shows no badge without open comments", () => {
    renderCard();
    expect(screen.queryByLabelText(/commenti aperti/)).not.toBeInTheDocument();
  });

  describe("organisation", () => {
    function Harness(props: Partial<Parameters<typeof ScenarioCard>[0]> & { startCollapsed?: boolean }) {
      const [collapsed, setCollapsed] = useState(props.startCollapsed ?? false);
      return (
        <ScenarioCard
          scenario={scenario({ errors: [] })}
          readOnly={false}
          onSave={vi.fn().mockResolvedValue(undefined)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          {...props}
        />
      );
    }

    it("collapsed card shows the title and tag but not the steps editor", () => {
      render(<Harness startCollapsed />);
      expect(screen.getByText("Pagamento ok")).toBeInTheDocument();
      expect(screen.getByText("@FDR3_001_02")).toBeInTheDocument();
      expect(screen.queryByLabelText("Step")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Espandi scenario #2" })).toHaveAttribute("aria-expanded", "false");
    });

    it("collapse then expand keeps unsaved text", async () => {
      render(<Harness />);
      await userEvent.type(screen.getByLabelText("Titolo scenario"), " extra");
      await userEvent.click(screen.getByRole("button", { name: "Comprimi scenario #2" }));
      expect(screen.getByText("Pagamento ok extra")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Espandi scenario #2" }));
      expect(screen.getByLabelText("Titolo scenario")).toHaveValue("Pagamento ok extra");
    });

    it("error badge shows the number of live errors", () => {
      render(
        <Harness
          scenario={scenario({ errors: [{ line: 1, message: "a" }, { line: 2, message: "b" }] })}
          startCollapsed
        />,
      );
      expect(screen.getByText("2 errori")).toBeInTheDocument();
    });

    it("duplicate sends the current draft, not the saved scenario", async () => {
      const onDuplicate = vi.fn().mockResolvedValue(undefined);
      render(<Harness onDuplicate={onDuplicate} />);
      await userEvent.clear(screen.getByLabelText("Step"));
      await userEvent.type(screen.getByLabelText("Step"), "Dato nuovo");
      await userEvent.click(screen.getByRole("button", { name: "Duplica scenario" }));
      expect(onDuplicate).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Pagamento ok", steps: "Dato nuovo", polarity: "positivo", kind: "scenario" }),
      );
    });

    it("Ctrl+Shift+D calls onDuplicate", () => {
      const onDuplicate = vi.fn().mockResolvedValue(undefined);
      render(<Harness onDuplicate={onDuplicate} />);
      fireEvent.keyDown(screen.getByLabelText("Titolo scenario"), { key: "D", ctrlKey: true, shiftKey: true });
      expect(onDuplicate).toHaveBeenCalledTimes(1);
    });

    it("move buttons call onMove and are disabled at the edges", async () => {
      const onMove = vi.fn();
      const { rerender } = render(<Harness onMove={onMove} canMoveUp canMoveDown />);
      await userEvent.click(screen.getByRole("button", { name: "Sposta scenario in alto" }));
      await userEvent.click(screen.getByRole("button", { name: "Sposta scenario in basso" }));
      expect(onMove).toHaveBeenNthCalledWith(1, "up");
      expect(onMove).toHaveBeenNthCalledWith(2, "down");
      rerender(<Harness onMove={onMove} canMoveUp={false} canMoveDown={false} />);
      expect(screen.getByRole("button", { name: "Sposta scenario in alto" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Sposta scenario in basso" })).toBeDisabled();
    });

    it("read-only card hides the action icons", () => {
      render(<Harness readOnly onDuplicate={vi.fn()} onMove={vi.fn()} onRemove={vi.fn()} />);
      expect(screen.queryByRole("button", { name: "Duplica scenario" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sposta scenario in alto" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Rimuovi scenario" })).not.toBeInTheDocument();
    });

    it("delete still needs confirmation", async () => {
      const onRemove = vi.fn().mockResolvedValue(undefined);
      render(<Harness onRemove={onRemove} />);
      await userEvent.click(screen.getByRole("button", { name: "Rimuovi scenario" }));
      expect(onRemove).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole("button", { name: "Conferma rimozione" }));
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("exposes an anchor id and the drag handle", () => {
      render(<Harness dragHandleProps={{ draggable: true }} />);
      expect(screen.getByRole("article")).toHaveAttribute("id", "scenario-sc1");
      expect(screen.getByRole("button", { name: "Trascina scenario" })).toHaveAttribute("draggable", "true");
    });
  });
});
