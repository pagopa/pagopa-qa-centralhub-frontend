import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationDetailSheet } from "@/components/release-status/ApplicationDetailSheet";
import type { ApplicationDetail, ApplicationRow, Cell, DeployEvent, RunRef } from "@/types/release-status";

const hooks = vi.hoisted(() => ({ detail: vi.fn() }));
const permissions = vi.hoisted(() => ({ allowed: new Set<string>() }));

vi.mock("@/hooks/useReleaseStatus", () => ({ useApplicationDetail: hooks.detail }));
vi.mock("@/lib/permissions", () => ({
  Gate: ({ action, children }: { action: string; children: ReactNode }) =>
    permissions.allowed.has(action) ? <>{children}</> : null,
}));

const local = (day: number, hour: number, minute: number) => new Date(2026, 10, day, hour, minute).toISOString();

function makeCell(version: string): Cell {
  return {
    version,
    read_status: "OK",
    error_detail: null,
    checked_at: local(16, 10, 0),
    last_ok_at: local(16, 10, 0),
    version_since: null,
    drift: "EQUAL",
    tests: [],
  };
}

function makeApp(overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: "app-1",
    name: "pagopa-checkout",
    product_id: "p1",
    product_key: "checkout",
    repository: "pagopa-checkout-be",
    pipeline_url: "https://pipelines.example/1",
    runtime: "AKS",
    ci: "GHA",
    kind: "backend",
    test_object: "checkout",
    ea_node_id: null,
    repo: makeCell("1.5.0"),
    envs: { DEV: makeCell("1.5.0"), UAT: makeCell("1.4.2"), PROD: makeCell("1.4.1") },
    flags: [],
    ...overrides,
  };
}

function makeRun(overrides: Partial<RunRef> = {}): RunRef {
  return {
    run_id: "run-1",
    kind: "NRT",
    outcome: "PASSED",
    needs_review: false,
    trigger_type: "schedule",
    timestamp_start: local(16, 10, 20),
    passed: 10,
    failed: 2,
    allure_url: "https://allure.example/1",
    gha_run_url: "https://github.com/pagopa/x/actions/runs/1",
    hub_url: "/nrts/report/run-1",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<DeployEvent> = {}): DeployEvent {
  return {
    version: "1.4.2",
    previous_version: "1.4.1",
    detected_at: local(16, 10, 15),
    previous_seen_at: local(16, 10, 0),
    is_baseline: false,
    direction: "upgrade",
    runs: [],
    ...overrides,
  };
}

function setDetail(detail: Partial<ApplicationDetail> = {}, extra: object = {}) {
  hooks.detail.mockReturnValue({
    data: { application: makeApp(), product_name: "Checkout", history: {}, ...detail },
    isLoading: false,
    isError: false,
    ...extra,
  });
}

describe("ApplicationDetailSheet", () => {
  beforeEach(() => {
    hooks.detail.mockReset();
    permissions.allowed = new Set();
    setDetail();
  });

  it("renders nothing without an application id", () => {
    render(<ApplicationDetailSheet applicationId={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows header with name, product, chips, links and current versions", () => {
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "pagopa-checkout" })).toBeInTheDocument();
    expect(within(dialog).getByText("Checkout")).toBeInTheDocument();
    expect(within(dialog).getByText("AKS")).toBeInTheDocument();
    expect(within(dialog).getByText("GHA")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Repository/ })).toHaveAttribute(
      "href",
      "https://github.com/pagopa/pagopa-checkout-be",
    );
    expect(within(dialog).getByRole("link", { name: /Pipeline/ })).toHaveAttribute("href", "https://pipelines.example/1");
    expect(within(dialog).getByRole("link", { name: /OpEx/ })).toBeInTheDocument();
    expect(within(dialog).getByText("1.4.1")).toBeInTheDocument();
  });

  it("links the EA Map component only when ea_node_id is set", () => {
    const { unmount } = render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    expect(screen.queryByRole("link", { name: /EA Map/ })).not.toBeInTheDocument();
    unmount();

    setDetail({ application: makeApp({ ea_node_id: "node-42" }) });
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    const link = screen.getByRole("link", { name: "EA Map: node-42" });
    expect(link).toHaveAttribute("href", "/ea-map#c-node-42");
  });

  it("offers DEV, UAT, PROD and Release GitHub tabs", () => {
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    const names = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(names).toEqual(["DEV", "UAT", "PROD", "Release GitHub"]);
  });

  it("lists events newest first with the detection window", async () => {
    setDetail({
      history: {
        DEV: [
          makeEvent({ version: "1.0.0", detected_at: local(10, 9, 0), previous_seen_at: null, is_baseline: true, direction: "baseline", previous_version: null }),
          makeEvent({ version: "1.4.2" }),
        ],
      },
    });
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("1.4.2");
    expect(items[1]).toHaveTextContent("1.0.0");
    expect(items[0]).toHaveTextContent("rilevato il 16/11 10:15 (tra 10:00 e 10:15)");
    expect(items[1]).toHaveTextContent("prima rilevazione");
    expect(items[1]).not.toHaveTextContent("tra ");
  });

  it("dates the detection window when it spans midnight", () => {
    setDetail({
      history: {
        DEV: [makeEvent({ detected_at: local(16, 0, 5), previous_seen_at: local(15, 23, 50) })],
      },
    });
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    expect(screen.getByRole("listitem")).toHaveTextContent("rilevato il 16/11 00:05 (tra 15/11 23:50 e 16/11 00:05)");
  });

  it("marks rollbacks with an accessible Undo2 icon", () => {
    setDetail({ history: { DEV: [makeEvent({ direction: "rollback" })] } });
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    expect(screen.getByRole("img", { name: "rollback" })).toBeInTheDocument();
  });

  it("lists linked runs with hub, Allure and GitHub Actions links", () => {
    setDetail({ history: { DEV: [makeEvent({ runs: [makeRun()] })] } });
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    const item = screen.getAllByRole("listitem")[0];
    expect(within(item).getByRole("link", { name: /Report/ })).toHaveAttribute("href", "/nrts/report/run-1");
    expect(within(item).getByRole("link", { name: /Allure/ })).toHaveAttribute("href", "https://allure.example/1");
    expect(within(item).getByRole("link", { name: /GitHub Actions/ })).toHaveAttribute(
      "href",
      "https://github.com/pagopa/x/actions/runs/1",
    );
    expect(item).toHaveTextContent("superata");
    expect(item).toHaveTextContent("10 ok / 2 ko");
  });

  it("shows the Release GitHub tab history without runs", async () => {
    setDetail({ history: { REPO: [makeEvent({ version: "1.5.0", runs: [makeRun()] })] } });
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: "Release GitHub" }));
    const item = screen.getAllByRole("listitem")[0];
    expect(item).toHaveTextContent("1.5.0");
    expect(within(item).queryByRole("link", { name: /Report/ })).not.toBeInTheDocument();
  });

  it("shows an empty message for a target without history", () => {
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    expect(screen.getByText("Nessun rilascio registrato")).toBeInTheDocument();
  });

  it("hints to link a test object, with the edit link gated by manage:status_page", () => {
    setDetail({ application: makeApp({ test_object: null }) });
    const { unmount } = render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    expect(screen.getByText("Collega un test object per vedere le run")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Modifica/ })).not.toBeInTheDocument();
    unmount();

    permissions.allowed = new Set(["manage:status_page"]);
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    expect(screen.getByRole("link", { name: /Modifica/ })).toHaveAttribute("href", "/releases/catalog");
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<ApplicationDetailSheet applicationId="app-1" onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows loading and error states", () => {
    hooks.detail.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { unmount } = render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    unmount();
    hooks.detail.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<ApplicationDetailSheet applicationId="app-1" onClose={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossibile caricare il dettaglio");
  });
});
