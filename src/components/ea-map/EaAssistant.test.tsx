import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildGraph } from "@/lib/ea-map/graph";
import type { EaKb } from "@/types/ea";
import { EaAssistant } from "./EaAssistant";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(public status: number, public body: unknown) {
      super(`API error ${status}`);
    }
  }
  return { apiClient: vi.fn(), ApiError };
});
vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient, ApiError: mocks.ApiError }));

const KB = {
  meta: {},
  nodes: [
    { id: "area:gps", type: "area", name: "GPS", desc: "" },
    { id: "prod:gpd", type: "product", parent: "area:gps", name: "GPD", desc: "", domain: "gps", conf: [] },
    { id: "svc-a", type: "component", parent: "prod:gpd", name: "Servizio A", desc: "" },
  ],
  edges: [],
  blueprint: { segments: [], services: [], functions: [], processes: [], infra: [], prodInfra: {}, risk: {}, riskSrc: null, panels: {} },
} as unknown as EaKb;

function setup() {
  const onHighlight = vi.fn();
  const onShow = vi.fn();
  const openNode = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <EaAssistant g={buildGraph(KB)} route={{ view: "map", nodeId: "prod:gpd" }} highlightOn={false}
        onHighlight={onHighlight} onShow={onShow} openNode={openNode} />
    </QueryClientProvider>,
  );
  return { onHighlight, onShow, openNode };
}

describe("EaAssistant", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
  });

  it("opens from the floating button and answers with node chips and highlight", async () => {
    mocks.apiClient.mockResolvedValue({
      answer: "Lo chiama **solo** [[svc-a]].",
      highlight: ["svc-a"],
      labels: { "svc-a": "Servizio A" },
      steps: [{ tool: "impatto", label: "Calcolato chi dipende da GPD" }],
    });
    const { onHighlight, onShow, openNode } = setup();
    fireEvent.click(screen.getByRole("button", { name: /chiedi alla mappa/i }));
    expect(screen.getByText("Stai guardando: GPD")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Se cambio GPD, chi si rompe?" }));

    const chip = await screen.findByRole("button", { name: "Servizio A" });
    const [path, opts] = mocks.apiClient.mock.calls[0];
    expect(path).toBe("/api/v1/ea/assistant/chat");
    expect(JSON.parse(opts.body)).toEqual({
      messages: [{ role: "user", content: "Se cambio GPD, chi si rompe?" }],
      context: { view: "map", node_id: "prod:gpd" },
    });
    expect(onHighlight).toHaveBeenCalledWith(["svc-a"]);
    expect(screen.getByText("solo").tagName).toBe("B");
    expect(screen.getByText(/1 passaggi/)).toBeTruthy();

    fireEvent.click(chip);
    expect(openNode).toHaveBeenCalledWith("svc-a");
    fireEvent.click(screen.getByRole("button", { name: /mostra sulla mappa/i }));
    expect(onShow).toHaveBeenCalledWith(["svc-a"]);
  });

  it("shows the backend error, e.g. when Gemini is not configured", async () => {
    mocks.apiClient.mockImplementation(() =>
      Promise.reject(new mocks.ApiError(503, { detail: "Assistente non configurato" })),
    );
    setup();
    fireEvent.click(screen.getByRole("button", { name: /chiedi alla mappa/i }));
    const box = screen.getByRole("textbox", { name: /domanda/i });
    fireEvent.change(box, { target: { value: "ciao" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(screen.getByText("Assistente non configurato")).toBeTruthy());
  });
});
