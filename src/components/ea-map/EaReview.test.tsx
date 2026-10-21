import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildGraph } from "@/lib/ea-map/graph";
import type { EaChange, EaKb, EaSyncStatus } from "@/types/ea";
import { EaReview, EaSyncBar } from "./EaReview";

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
    { id: "area:gps", type: "area", name: "GPS", desc: "" },
    { id: "prod:gpd", type: "product", parent: "area:gps", name: "GPD", desc: "", domain: "gps", conf: [] },
    { id: "svc-a", type: "component", parent: "prod:gpd", name: "Servizio A", desc: "" },
    { id: "svc-b", type: "component", parent: "prod:gpd", name: "Servizio B", desc: "" },
  ],
  edges: [],
  blueprint: { segments: [], services: [], functions: [], processes: [], infra: [], prodInfra: {}, risk: {}, riskSrc: null, panels: {} },
} as unknown as EaKb;

const change = (over: Partial<EaChange>): EaChange => ({
  id: "c1",
  run_id: "r1",
  entity: "edge",
  op: "add",
  target_id: "svc-a>svc-b:api",
  before: null,
  after: { evidence: { value: "https://x/gpd/api" } },
  structural: true,
  status: "pending",
  reviewed_by: null,
  reviewed_at: null,
  review_note: null,
  created_at: "2026-10-15T10:00:00Z",
  ...over,
});

const CHANGES: EaChange[] = [
  change({}),
  change({ id: "c2", target_id: "svc-b>svc-a:data" }),
  change({
    id: "c3",
    entity: "node",
    op: "add",
    target_id: "pagopa-new",
    after: { name: "New", parent_id: null, ctype: "be", attrs: { owners: ["team-gps"], ns: "gps" } },
  }),
  change({ id: "c4", op: "remove", status: "conflict", target_id: "svc-a>svc-b:event", after: null }),
];

const STATUS: EaSyncStatus = {
  running: null,
  last: { id: "r1", trigger: "beat", triggered_by: null, started_at: "2026-10-13T04:17:00Z", finished_at: "2026-10-13T04:20:00Z", status: "partial", stats: { auto_applied: 3 }, error: "Spazio Confluence PN5 non accessibile" },
  last_success_at: "2026-10-13T04:20:00Z",
  last_error: null,
  open_changes: 4,
};

function setup(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("EaReview", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
    mocks.can.mockReset();
    mocks.can.mockReturnValue(true);
    mocks.apiClient.mockImplementation((path: string) => {
      if (path.startsWith("/api/v1/ea/changes?")) return Promise.resolve(CHANGES);
      if (path === "/api/v1/ea/sync-status") return Promise.resolve(STATUS);
      if (path.startsWith("/api/v1/ea/sync-runs")) return Promise.resolve([]);
      return Promise.resolve({});
    });
  });

  it("groups proposals and requires a product before adding a repository", async () => {
    const g = buildGraph(KB);
    setup(<EaReview g={g} goTo={() => {}} onOpen={() => {}} />);
    expect(await screen.findByText("Nuovi repository")).toBeInTheDocument();
    expect(screen.getByText("Nuove dipendenze")).toBeInTheDocument();
    expect(screen.getByText("Conflitti")).toBeInTheDocument();
    expect(screen.getByText("Conferma tutte")).toBeInTheDocument();

    const add = screen.getByRole("button", { name: /Aggiungi alla mappa/ });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Prodotto"), { target: { value: "prod:gpd" } });
    fireEvent.click(add);
    await waitFor(() =>
      expect(mocks.apiClient).toHaveBeenCalledWith(
        "/api/v1/ea/changes/c3/approve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ note: null, name: "New", parent_id: "prod:gpd", ctype: "be", actor: "qa@example.test" }),
        }),
      ),
    );
  });

  it("shows Data Lake producer proposals in their own group", async () => {
    const kb = {
      ...KB,
      nodes: [...KB.nodes, { id: "dc:pagopa:gpd:payment-position", type: "dataset", name: "Payment Position", desc: "" }],
    } as unknown as EaKb;
    mocks.apiClient.mockImplementation((path: string) => {
      if (path.startsWith("/api/v1/ea/changes?"))
        return Promise.resolve([
          change({
            id: "p1",
            target_id: "svc-a>dc:pagopa:gpd:payment-position:produces",
            after: {
              origin: "contract_rule",
              confidence: 90,
              evidence: { topic: "gpd-ingestion.apd.payment_position", rule: "regola ^gpd-ingestion" },
            },
          }),
        ]);
      if (path === "/api/v1/ea/sync-status") return Promise.resolve(STATUS);
      return Promise.resolve([]);
    });
    setup(<EaReview g={buildGraph(kb)} goTo={() => {}} onOpen={() => {}} />);
    expect(await screen.findByText("Produttori del Data Lake")).toBeInTheDocument();
    expect(screen.queryByText("Nuove dipendenze")).not.toBeInTheDocument();
    expect(screen.getByText("Payment Position")).toBeInTheDocument();
    expect(screen.getByText("confidenza 90%")).toBeInTheDocument();
    expect(screen.getByText("gpd-ingestion.apd.payment_position")).toBeInTheDocument();
  });

  it("hides decisions without the review permission", async () => {
    mocks.can.mockImplementation((a: string) => a !== "review:ea_map");
    const g = buildGraph(KB);
    setup(<EaReview g={g} goTo={() => {}} onOpen={() => {}} />);
    expect(await screen.findByText("Nuovi repository")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Conferma/ })).not.toBeInTheDocument();
  });
});

describe("EaSyncBar", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
    mocks.can.mockReturnValue(true);
    mocks.apiClient.mockImplementation((path: string) =>
      Promise.resolve(path === "/api/v1/ea/sync-status" ? STATUS : { id: "r2", status: "running" }),
    );
  });

  it("shows the last outcome and starts a sync", async () => {
    const onReview = vi.fn();
    setup(<EaSyncBar onReview={onReview} />);
    expect(await screen.findByText(/parziale/)).toBeInTheDocument();
    expect(screen.getByText("Spazio Confluence PN5 non accessibile")).toBeInTheDocument();
    fireEvent.click(screen.getByText("4 da revisionare"));
    expect(onReview).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Sincronizza ora/ }));
    await waitFor(() =>
      expect(mocks.apiClient).toHaveBeenCalledWith(
        "/api/v1/ea/sync",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ actor: "qa@example.test" }) }),
      ),
    );
  });
});
