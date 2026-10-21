import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildGraph } from "@/lib/ea-map/graph";
import type { EaFlow, EaKb } from "@/types/ea";
import { EaFlows } from "./EaFlows";

const mocks = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient, ApiError: Error }));

const KB = {
  meta: {}, nodes: [], edges: [],
  blueprint: { segments: [], services: [], functions: [], processes: [], infra: [], prodInfra: {}, risk: {}, riskSrc: null, panels: {} },
} as unknown as EaKb;

const FLOW: EaFlow = {
  id: "modello-3", name: "Pagamento di un avviso presso un PSP", subtitle: "Modello 3", process: "pr-m3",
  process_name: "Pagamento presso PSP (Modello 3)", services: [{ id: "sv-avviso", name: "Pagamento avviso" }],
  lanes: [
    { id: "ext-psp", name: "PSP", type: "external", product: null },
    { id: "nodo", name: "Nodo dei Pagamenti (core)", type: "component", product: "Nodo" },
    { id: "gpd", name: "GPD Payments", type: "component", product: "GPD" },
  ],
  steps: [
    { index: 0, from: "ext-psp", to: "nodo", kind: "sync", primitive: "verifyPaymentNotice", text: "Il PSP verifica l'avviso.", on_map: false, edge: null },
    { index: 1, from: "nodo", to: "gpd", kind: "sync", primitive: "paVerifyPaymentNotice", text: "Il Nodo chiede all'Ente.", on_map: true, edge: { type: "soap", origin: "curated", reverse: false } },
    { index: 2, from: "ext-psp", to: "ext-psp", kind: "self", primitive: "Incasso", text: "Il PSP incassa.", on_map: null, edge: null, layer: "piattaforma", optional: true },
  ],
  missing: [], validated: false, source: "Bozza", sanp_url: "https://developer.pagopa.it/x",
};

function setup() {
  const onShow = vi.fn();
  const openNode = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EaFlows g={buildGraph(KB)} flowId={null} onSelect={() => {}} openNode={openNode} onShow={onShow} />
    </QueryClientProvider>,
  );
  return { onShow, openNode };
}

describe("EaFlows", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
    mocks.apiClient.mockResolvedValue([FLOW]);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("steps through the flow and tells whether each step is on the map", async () => {
    const { onShow, openNode } = setup();
    expect(await screen.findByText("Passo 1 di 3")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Caso d'uso SANP/ })).toHaveAttribute("href", "https://developer.pagopa.it/x");
    expect(screen.getByText("legame non presente sulla mappa")).toBeTruthy();
    expect(screen.getByText(/1 passo usa un legame/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Passo successivo" }));
    expect(screen.getByText("Passo 2 di 3")).toBeTruthy();
    expect(screen.getByText(/✓ sulla mappa · soap · curated/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "GPD Payments" }));
    expect(openNode).toHaveBeenCalledWith("gpd");

    fireEvent.click(screen.getByRole("button", { name: /Passo 3: Incasso/ }));
    expect(screen.getByText("Il PSP incassa.")).toBeTruthy();
    expect(screen.getByText("dettaglio di piattaforma")).toBeTruthy();
    expect(screen.getByText("opzionale")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /mostra sulla mappa/i }));
    expect(onShow).toHaveBeenCalledWith(["ext-psp", "nodo", "gpd"]);
  });

  it("plays the flow on its own", async () => {
    setup();
    await screen.findByText("Passo 1 di 3");
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Avvia" }));
    await act(async () => {
      vi.advanceTimersByTime(2700);
    });
    expect(screen.getByText("Passo 2 di 3")).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(2700);
    });
    expect(screen.getByText("Passo 3 di 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Avvia" })).toBeTruthy(); // stopped at the end
  });
});
