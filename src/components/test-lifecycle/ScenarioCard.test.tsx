import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlScenario } from "@/types/test-lifecycle";
import { ScenarioCard } from "./ScenarioCard";

const mocks = vi.hoisted(() => ({ validate: vi.fn() }));

vi.mock("@/hooks/useTestLifecycle", () => ({
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
      onSave={onSave}
      onReload={props.onReload ?? vi.fn()}
    />,
  );
  return { onSave };
}

describe("ScenarioCard", () => {
  beforeEach(() => mocks.validate.mockReset());
  afterEach(() => vi.useRealTimers());

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

  it("shows the reload banner on a stale lock 409 and keeps the local text", async () => {
    const onReload = vi.fn();
    const onSave = vi
      .fn()
      .mockRejectedValue(new ApiError(409, { detail: { code: "stale_lock", message: "x" } }));
    renderCard({ onSave, onReload });
    const title = screen.getByLabelText("Titolo scenario");
    await userEvent.clear(title);
    await userEvent.type(title, "Titolo nuovo");
    await userEvent.click(screen.getByRole("button", { name: "Salva" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: "Titolo nuovo" }));
    expect(
      await screen.findByText(
        "La bozza è stata modificata da un altro utente. Ricarica per vedere le modifiche.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Titolo scenario")).toHaveValue("Titolo nuovo");
    await userEvent.click(screen.getByRole("button", { name: "Ricarica" }));
    expect(onReload).toHaveBeenCalled();
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

  it("is fully read-only when readOnly", () => {
    renderCard({ readOnly: true });
    expect(screen.getByLabelText("Titolo scenario")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Step")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Salva" })).not.toBeInTheDocument();
  });
});
