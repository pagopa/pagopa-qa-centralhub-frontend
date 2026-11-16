import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReleasesPage from "./page";
import { ApiError } from "@/lib/api";
import type {
  AppFlag,
  ApplicationRow,
  Cell,
  ReleaseStatus,
  SyncStatus,
} from "@/types/release-status";

const hooks = vi.hoisted(() => ({
  status: vi.fn(),
  syncStatus: vi.fn(),
  trigger: vi.fn(),
  detail: vi.fn(() => ({ data: undefined, isLoading: true, isError: false })),
}));

const nav = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}));

const permissions = vi.hoisted(() => ({ allowed: new Set<string>() }));

vi.mock("@/hooks/useReleaseStatus", () => ({
  useReleaseStatus: hooks.status,
  useApplicationDetail: hooks.detail,
  useReleaseSyncStatus: hooks.syncStatus,
  useTriggerReleaseSync: hooks.trigger,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => "/releases",
}));

vi.mock("@/lib/permissions", () => ({
  Gate: ({ action, children }: { action: string; children: ReactNode }) =>
    permissions.allowed.has(action) ? <>{children}</> : null,
}));

vi.mock("@/components/auth/RouteGuard", () => ({
  RouteGuard: ({ action, children }: { action: string; children: ReactNode }) => (
    <div data-testid="route-guard" data-action={action}>{children}</div>
  ),
}));

function makeCell(overrides: Partial<Cell> = {}): Cell {
  return {
    version: "1.4.2",
    read_status: "OK",
    error_detail: null,
    checked_at: "2026-11-16T10:00:00Z",
    last_ok_at: "2026-11-16T10:00:00Z",
    version_since: "2026-11-10T08:00:00Z",
    drift: "EQUAL",
    tests: [],
    ...overrides,
  };
}

function makeApp(name: string, flags: AppFlag[] = [], overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: `id-${name}`,
    name,
    product_id: "p",
    product_key: `key-${name}`,
    repository: `pagopa-${name.toLowerCase()}`,
    pipeline_url: "https://github.com/pagopa/actions",
    runtime: "AKS",
    ci: "GHA",
    kind: "backend",
    test_object: null,
    ea_node_id: null,
    repo: makeCell({ drift: null }),
    envs: { DEV: makeCell(), UAT: makeCell(), PROD: makeCell() },
    flags,
    ...overrides,
  };
}

const syncOk: SyncStatus = {
  status: "OK",
  trigger: "SCHEDULED",
  requested_by: null,
  queued_at: null,
  started_at: null,
  finished_at: new Date().toISOString(),
  last_success_at: new Date().toISOString(),
  applications_checked: 4,
  reads_failed: 0,
  errors: [],
  in_progress: false,
};

const data: ReleaseStatus = {
  sync: syncOk,
  areas: [
    {
      area: "CORE",
      products: [
        {
          id: "p-zeta",
          name: "Zeta Payments",
          applications: [
            makeApp("Zeta-Service", ["DRIFT"], {
              envs: { DEV: makeCell(), UAT: makeCell(), PROD: makeCell({ version: "1.4.1", drift: "BEHIND" }) },
            }),
          ],
        },
        {
          id: "p-alpha",
          name: "Alpha Fees",
          applications: [makeApp("AFM-Calculator", ["ALIGNED"]), makeApp("AFM-Marketplace", ["ALIGNED"])],
        },
      ],
    },
    {
      area: "TOUCHPOINT",
      products: [{ id: "p-io", name: "IO Touchpoint", applications: [makeApp("IO-Checkout", ["ALIGNED"])] }],
    },
  ],
};

function queryResult<T>(value: T, overrides: Record<string, unknown> = {}) {
  return { data: value, isLoading: false, isError: false, error: null, ...overrides };
}

const mutate = vi.fn();
const reset = vi.fn();

function mutationResult(overrides: Record<string, unknown> = {}) {
  return { mutate, reset, isPending: false, isError: false, error: null, ...overrides };
}

function productNames(): string[] {
  return screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent ?? "");
}

describe("Releases page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.search = "";
    permissions.allowed = new Set(["view:status_page", "sync:trigger", "manage:status_page"]);
    hooks.status.mockReturnValue(queryResult(data));
    hooks.syncStatus.mockReturnValue(queryResult(syncOk));
    hooks.trigger.mockReturnValue(mutationResult());
  });

  it("is wrapped in the status page route guard", () => {
    render(<ReleasesPage />);

    expect(screen.getByTestId("route-guard")).toHaveAttribute("data-action", "view:status_page");
    expect(screen.getByRole("heading", { level: 1, name: "Release Status" })).toBeInTheDocument();
  });

  it("renders the Core products sorted by name", () => {
    render(<ReleasesPage />);

    expect(productNames()).toEqual([
      expect.stringContaining("Alpha Fees"),
      expect.stringContaining("Zeta Payments"),
    ]);
    expect(screen.getByText("AFM-Calculator")).toBeInTheDocument();
    expect(screen.queryByText("IO-Checkout")).not.toBeInTheDocument();
  });

  it("switches to the TouchPoint area and writes it to the query string", async () => {
    const user = userEvent.setup();
    render(<ReleasesPage />);

    await user.click(screen.getByRole("tab", { name: /TouchPoint/ }));

    expect(screen.getByText("IO-Checkout")).toBeInTheDocument();
    expect(screen.queryByText("AFM-Calculator")).not.toBeInTheDocument();
    expect(nav.replace).toHaveBeenLastCalledWith("/releases?area=TOUCHPOINT", { scroll: false });
  });

  it("preselects the filter chip from the query string", () => {
    nav.search = "filter=drift";
    render(<ReleasesPage />);

    expect(screen.getByRole("button", { name: /^Con versioni diverse/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Zeta-Service")).toBeInTheDocument();
    expect(screen.queryByText("AFM-Calculator")).not.toBeInTheDocument();
  });

  it("filters rows with the search box", async () => {
    const user = userEvent.setup();
    render(<ReleasesPage />);

    await user.type(screen.getByRole("searchbox", { name: "Cerca applicazione" }), "market");

    expect(screen.getByText("AFM-Marketplace")).toBeInTheDocument();
    expect(screen.queryByText("AFM-Calculator")).not.toBeInTheDocument();
    expect(screen.queryByText("Zeta-Service")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<ReleasesPage />);

    await user.type(screen.getByRole("searchbox", { name: "Cerca applicazione" }), "nothing-here");

    const empty = screen.getByRole("status", { name: "Nessun risultato" });
    expect(within(empty).getByText("Nessun risultato")).toBeInTheDocument();
    expect(empty.querySelector(".lucide-search-x")).not.toBeNull();
  });

  it("sets the filter from a KPI", async () => {
    const user = userEvent.setup();
    render(<ReleasesPage />);

    await user.click(screen.getByRole("button", { name: "con versioni diverse: 1" }));

    expect(screen.getByRole("button", { name: /^Con versioni diverse$/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("AFM-Calculator")).not.toBeInTheDocument();
  });

  it("opens the application detail when a row is clicked", async () => {
    const user = userEvent.setup();
    render(<ReleasesPage />);

    await user.click(screen.getByRole("button", { name: "AFM-Calculator" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(hooks.detail).toHaveBeenCalledWith("id-AFM-Calculator");
  });

  it("hides the sync button without sync:trigger", () => {
    permissions.allowed.delete("sync:trigger");
    render(<ReleasesPage />);

    expect(screen.queryByRole("button", { name: /Sincronizza/ })).not.toBeInTheDocument();
  });

  it("triggers a sync from the button", async () => {
    const user = userEvent.setup();
    render(<ReleasesPage />);

    await user.click(screen.getByRole("button", { name: "Sincronizza ora" }));

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it.each(["QUEUED", "RUNNING"] as const)("shows the sync in progress while %s", (state) => {
    hooks.syncStatus.mockReturnValue(queryResult({ ...syncOk, status: state, in_progress: true }));
    render(<ReleasesPage />);

    expect(screen.getByRole("button", { name: "Sincronizzazione…" })).toBeDisabled();
  });

  it.each(["QUEUED", "RUNNING"] as const)("re-enables the button when a %s sync is stale", (state) => {
    hooks.syncStatus.mockReturnValue(queryResult({ ...syncOk, status: state, in_progress: false }));
    render(<ReleasesPage />);

    expect(screen.getByRole("button", { name: "Sincronizza ora" })).toBeEnabled();
    expect(screen.queryByText(/Sincronizzazione in/)).not.toBeInTheDocument();
  });

  it("resets the trigger error when the sync finishes", () => {
    render(<ReleasesPage />);

    const options = hooks.syncStatus.mock.calls.at(-1)?.[0] as { onFinished?: () => void } | undefined;
    options?.onFinished?.();

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("opens the area that matches a filter from the overview link", () => {
    nav.search = "filter=unreachable";
    hooks.status.mockReturnValue(
      queryResult({
        ...data,
        areas: [
          data.areas[0],
          {
            area: "TOUCHPOINT",
            products: [
              {
                id: "p-io",
                name: "IO Touchpoint",
                applications: [makeApp("IO-Checkout", ["UNREACHABLE"]), makeApp("IO-Wallet", ["UNREACHABLE"])],
              },
            ],
          },
        ],
      }),
    );
    render(<ReleasesPage />);

    expect(screen.getByRole("tab", { name: /TouchPoint/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("IO-Checkout")).toBeInTheDocument();
    expect(screen.getByText("IO-Wallet")).toBeInTheDocument();
  });

  it("keeps the area from the query string even without matches", () => {
    nav.search = "area=CORE&filter=unreachable";
    render(<ReleasesPage />);

    expect(screen.getByRole("tab", { name: /Core/ })).toHaveAttribute("aria-selected", "true");
  });

  it("shows the matches of the active filter on each area tab", () => {
    nav.search = "filter=drift";
    render(<ReleasesPage />);

    expect(within(screen.getByRole("tab", { name: /Core/ })).getByLabelText("1 risultati")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /TouchPoint/ })).getByLabelText("0 risultati")).toBeInTheDocument();
  });

  it("hides the area counts without a filter", () => {
    render(<ReleasesPage />);

    expect(screen.queryByLabelText(/risultati$/)).not.toBeInTheDocument();
  });

  it("explains a 409 as a sync already in progress", () => {
    hooks.trigger.mockReturnValue(
      mutationResult({ isError: true, error: new ApiError(409, { detail: "conflict" }) }),
    );
    render(<ReleasesPage />);

    expect(screen.getByText("Sincronizzazione già in corso")).toBeInTheDocument();
  });

  it("shows the backend detail on 503", () => {
    hooks.trigger.mockReturnValue(
      mutationResult({ isError: true, error: new ApiError(503, { detail: "Coda non disponibile" }) }),
    );
    render(<ReleasesPage />);

    expect(screen.getByText("Coda non disponibile")).toBeInTheDocument();
  });

  it("hides Gestisci catalogo without manage:status_page", () => {
    permissions.allowed.delete("manage:status_page");
    render(<ReleasesPage />);

    expect(screen.queryByRole("link", { name: /Gestisci catalogo/ })).not.toBeInTheDocument();
  });

  it("links Gestisci catalogo with manage:status_page", () => {
    render(<ReleasesPage />);

    expect(screen.getByRole("link", { name: /Gestisci catalogo/ })).toHaveAttribute("href", "/releases/catalog");
  });

  it("warns when the last sync failed", () => {
    hooks.syncStatus.mockReturnValue(queryResult({ ...syncOk, status: "FAILED" }));
    render(<ReleasesPage />);

    expect(screen.getByText("Dati non aggiornati")).toBeInTheDocument();
  });

  it("notes failed reads on a partial sync", () => {
    hooks.syncStatus.mockReturnValue(queryResult({ ...syncOk, status: "PARTIAL", reads_failed: 3 }));
    render(<ReleasesPage />);

    expect(screen.getByText("3 letture non riuscite")).toBeInTheDocument();
  });

  it("links the repository, pipeline and OpEx dashboard", () => {
    render(<ReleasesPage />);

    expect(screen.getByRole("link", { name: "Repository di AFM-Calculator" })).toHaveAttribute(
      "href",
      "https://github.com/pagopa/pagopa-afm-calculator",
    );
    expect(screen.getByRole("link", { name: "Dashboard OpEx di AFM-Calculator" })).toHaveAttribute(
      "href",
      "https://portal.azure.com/#@pagopait.onmicrosoft.com/dashboard/arm/subscriptions/b9fc9419-6097-45fe-9f74-ba0641c91912/resourceGroups/dashboards/providers/Microsoft.Portal/dashboards/pagopa-p-opex_pagopa-afm-calculator",
    );
  });

  it("renders skeleton rows while loading", () => {
    hooks.status.mockReturnValue(queryResult(undefined, { isLoading: true }));
    render(<ReleasesPage />);

    expect(screen.getByRole("status", { name: "Caricamento release" })).toBeInTheDocument();
  });
});
