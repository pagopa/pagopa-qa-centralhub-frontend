import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildGraph } from "@/lib/ea-map/graph";
import type { EaEdgeDetail, EaKb, EaNodeDetail } from "@/types/ea";
import { EaRelations } from "./EaRelations";

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
  can: vi.fn<(action: string) => boolean>(() => true),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "qa@example.test", name: "QA" } } }),
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: mocks.can, role: "qa_manager", isLoading: false }),
}));
vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient }));

const KB = {
  meta: {},
  nodes: [
    { id: "area:core", type: "area", name: "Core", desc: "" },
    { id: "prod:nodo", type: "product", parent: "area:core", name: "Nodo", desc: "", domain: "nodo", conf: [] },
    { id: "svc-a", type: "component", parent: "prod:nodo", name: "Servizio A", desc: "" },
    { id: "svc-b", type: "component", parent: "prod:nodo", name: "Servizio B", desc: "" },
    { id: "ext-psp", type: "external", name: "PSP", desc: "" },
  ],
  edges: [],
  blueprint: { segments: [], services: [], functions: [], processes: [], infra: [], prodInfra: {}, risk: {}, riskSrc: null, panels: {} },
} as unknown as EaKb;

const edge = (over: Partial<EaEdgeDetail>): EaEdgeDetail => ({
  id: "e1",
  from: "svc-a",
  to: "svc-b",
  type: "api",
  label: null,
  origin: "helm",
  status: "active",
  confidence: 60,
  note: null,
  evidence: null,
  created_by: null,
  verified_by: null,
  verified_at: null,
  ...over,
});

const DETAIL: EaNodeDetail = {
  id: "svc-a",
  kind: "component",
  parent: "prod:nodo",
  name: "Servizio A",
  desc: null,
  attrs: {},
  source: "curated",
  status: "active",
  verified_at: null,
  verified_by: null,
  qa: null,
  docs: [],
  out: [
    edge({}),
    edge({ id: "e2", to: "ext-psp", type: "event", origin: "manual", status: "verified", verified_by: "x@y", note: "da Confluence" }),
    edge({ id: "e3", to: "ext-psp", type: "data", status: "removed", note: "non esiste" }),
    edge({ id: "e4", to: "svc-b", type: "serves" }),
  ],
  in: [],
};

function renderRelations() {
  const g = buildGraph(KB);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EaRelations g={g} node={g.byId.get("svc-a")!} onOpen={() => {}} />
    </QueryClientProvider>,
  );
}

describe("EaRelations", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
    mocks.can.mockReset();
    mocks.can.mockReturnValue(true);
    mocks.apiClient.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith("/verify") ? edge({ status: "verified" }) : DETAIL),
    );
  });

  it("shows provenance and verification state, hiding removed and blueprint edges", async () => {
    renderRelations();
    expect(await screen.findByText("Servizio B")).toBeInTheDocument();
    expect(screen.getByText("dal codice")).toBeInTheDocument();
    expect(screen.getByText("manuale")).toBeInTheDocument();
    expect(screen.getByText("da verificare")).toBeInTheDocument();
    expect(screen.getByText("✓ verificato")).toBeInTheDocument();
    expect(screen.getByText("da Confluence")).toBeInTheDocument();
    expect(screen.queryByText("non esiste")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Mostra legami rimossi (1)")).toBeInTheDocument();
  });

  it("confirms an edge sending the session user as actor", async () => {
    renderRelations();
    fireEvent.click(await screen.findByRole("button", { name: "Conferma legame" }));
    await waitFor(() =>
      expect(mocks.apiClient).toHaveBeenCalledWith(
        "/api/v1/ea/edges/e1/verify",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ note: null, actor: "qa@example.test" }) }),
      ),
    );
  });

  it("hides editing controls without the edit:ea_map permission", async () => {
    mocks.can.mockReturnValue(false);
    renderRelations();
    expect(await screen.findByText("Servizio B")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Conferma legame" })).not.toBeInTheDocument();
    expect(screen.queryByText("Aggiungi legame")).not.toBeInTheDocument();
  });
});
