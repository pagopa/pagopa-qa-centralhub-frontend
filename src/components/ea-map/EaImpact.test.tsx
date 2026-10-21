import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildGraph } from "@/lib/ea-map/graph";
import type { EaKb, EaReleaseImpact } from "@/types/ea";
import { EaImpact } from "./EaImpact";

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
    { id: "gpd-core", type: "component", parent: "prod:gpd", name: "GPD Core", desc: "" },
    { id: "wisp", type: "component", parent: "prod:gpd", name: "WISP Converter", desc: "" },
    { id: "checkout", type: "component", parent: "prod:gpd", name: "Checkout FE", desc: "" },
  ],
  edges: [],
  blueprint: { segments: [], services: [], functions: [], processes: [], infra: [], prodInfra: {}, risk: {}, riskSrc: null, panels: {} },
} as unknown as EaKb;

const RESULT: EaReleaseImpact = {
  change: { repo: "gpd-core", title: "Nuovo campo IUV", url: "https://github.com/pagopa/gpd-core/pull/7", ref: "PR #7", state: "open", files: 3, additions: 40, deletions: 2 },
  component: { id: "gpd-core", name: "GPD Core", product: "GPD", qa_score: 3 },
  risk: "alto",
  categories: [{ key: "contract", label: "Contratto API", weight: 3, files: 1, examples: ["openapi/openapi.json"] }],
  impacted: [
    { id: "wisp", name: "WISP Converter", type: "component", product: "GPD", relation: "chiamante", relations: ["chiamante", "dipendenza"], depth: 1, via: "api", path: ["gpd-core", "wisp"], risk: "alto", reason: "", qa_score: 4 },
    { id: "checkout", name: "Checkout FE", type: "component", product: "GPD", relation: "chiamante", depth: 2, via: "api", path: ["gpd-core", "wisp", "checkout"], risk: "medio", reason: "", qa_score: 0 },
  ],
  suites: [
    { name: "integration/gpd", kind: "suite centrale", covers: ["gpd-core"], priority: 0 },
    { name: "e2e/checkout", kind: "suite centrale", covers: ["checkout"], priority: 2 },
  ],
  gaps: [{ id: "checkout", name: "Checkout FE", qa_score: 0, reason: "nessun test di integrazione trovato" }],
  processes: [{ id: "pr-gpd", name: "Creazione e pubblicazione posizioni", services: ["Posizioni debitorie"], ref: { title: "[GPD]", url: "https://x/p" }, via: ["GPD"] }],
  highlight: ["gpd-core", "wisp", "checkout"],
};

function setup() {
  const onShow = vi.fn();
  const openNode = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EaImpact g={buildGraph(KB)} openNode={openNode} onShow={onShow} />
    </QueryClientProvider>,
  );
  return { onShow, openNode };
}

describe("EaImpact", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
  });

  it("analyses a pull request and shows risk, impacts, suites, gaps and processes", async () => {
    mocks.apiClient.mockResolvedValue(RESULT);
    const { onShow, openNode } = setup();
    fireEvent.change(screen.getByLabelText(/link della pull request/i), {
      target: { value: "https://github.com/pagopa/gpd-core/pull/7" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analizza/i }));

    expect(await screen.findByText("Nuovo campo IUV")).toBeTruthy();
    expect(JSON.parse(mocks.apiClient.mock.calls[0][1].body)).toEqual({ url: "https://github.com/pagopa/gpd-core/pull/7" });
    expect(screen.getByText("Alto", { selector: "b" })).toBeTruthy();
    expect(screen.getByText("integration/gpd")).toBeTruthy();
    expect(screen.getByText("dipendenza reciproca")).toBeTruthy();
    expect(screen.getByText(/Consigliate per gli impatti indiretti · 1/)).toBeTruthy();
    expect(screen.getByText("Creazione e pubblicazione posizioni")).toBeTruthy();
    expect(screen.getByText(/nessun test di integrazione/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /WISP Converter/ }));
    expect(openNode).toHaveBeenCalledWith("wisp");
    fireEvent.click(screen.getByRole("button", { name: /mostra sulla mappa/i }));
    expect(onShow).toHaveBeenCalledWith(["gpd-core", "wisp", "checkout"]);
  });

  it("sends repository and tags in the second mode and shows backend errors", async () => {
    mocks.apiClient.mockRejectedValue(new mocks.ApiError(422, { detail: "Il repository x non è nella mappa" }));
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /repository e tag/i }));
    fireEvent.change(screen.getByLabelText("Repository"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Riferimento di partenza"), { target: { value: "1.0.0" } });
    fireEvent.click(screen.getByRole("button", { name: /analizza/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Il repository x non è nella mappa");
    expect(JSON.parse(mocks.apiClient.mock.calls[0][1].body)).toEqual({ repo: "x", base: "1.0.0", head: "main" });
  });
});
