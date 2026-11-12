import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import OriginNrtsPage from "./OriginNrtsPage";

const mocks = vi.hoisted(() => ({
  useNrts: vi.fn(),
  useNrtsSuites: vi.fn(),
  useSuites: vi.fn(),
  useFlakyScenarios: vi.fn(),
  refetchNrts: vi.fn(),
  refetchSuites: vi.fn(),
  tableProps: vi.fn(),
}));

vi.mock("@/hooks/useNrts", () => ({
  useNrts: (...a: unknown[]) => mocks.useNrts(...a),
  useNrtsSuites: (...a: unknown[]) => mocks.useNrtsSuites(...a),
  useFlakyScenarios: (...a: unknown[]) => mocks.useFlakyScenarios(...a),
  useNrtDetailsScenarios: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("@/hooks/useSuites", () => ({ useSuites: (...a: unknown[]) => mocks.useSuites(...a) }));
vi.mock("@/components/nrts/NrtsTable", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.tableProps(props);
    return <div data-testid="table">{props.toolbar as ReactNode}</div>;
  },
}));
vi.mock("@/components/nrts/SuiteCard", () => ({
  SuiteCard: ({ suite, onClick }: { suite: { test_object: string }; onClick: () => void }) => (
    <button type="button" onClick={onClick}>card-{suite.test_object}</button>
  ),
}));

const FLAKY = [{ suite_id: "s", scenario_name: "x", test_object: "wisp", test_object_version: "1", test_version: "1" }];

function setup(error: unknown = null) {
  mocks.useNrts.mockReturnValue({
    data: { items: [], total: 0 },
    isLoading: false,
    error,
    refetch: mocks.refetchNrts,
    isFetching: false,
  });
  mocks.useNrtsSuites.mockReturnValue({
    data: [{ suite: { test_object: "wisp" }, trend: [] }],
    isLoading: false,
    refetch: mocks.refetchSuites,
    isFetching: false,
  });
  mocks.useSuites.mockReturnValue({ data: ["wisp"], isLoading: false });
  mocks.useFlakyScenarios.mockReturnValue({ data: FLAKY });
}

function renderPage(origin: "TAS" | "QG" | "NRT", children?: ReactNode) {
  render(<OriginNrtsPage origin={origin} title="Titolo">{children}</OriginNrtsPage>);
}

describe("OriginNrtsPage", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    setup();
  });

  it("does not send an origin for the NRT list and shows the NRT table", () => {
    renderPage("NRT");
    expect(mocks.useNrts).toHaveBeenCalledWith(expect.objectContaining({ origin: undefined, page: 1 }));
    expect(mocks.useNrtsSuites).toHaveBeenCalledWith({ origin: undefined });
    expect(mocks.useSuites).toHaveBeenCalledWith({ origin: undefined });
    const props = mocks.tableProps.mock.calls.at(-1)![0];
    expect(props).toMatchObject({ isTasOnly: false, origin: "NRT" });
  });

  it.each(["TAS", "QG"] as const)("keeps asking for the %s runs only", (origin) => {
    renderPage(origin);
    expect(mocks.useNrts).toHaveBeenCalledWith(expect.objectContaining({ origin }));
    const props = mocks.tableProps.mock.calls.at(-1)![0];
    expect(props).toMatchObject({ isTasOnly: true, origin, flakyScenariosData: [] });
  });

  it("gives the flaky scenarios to the NRT table only", () => {
    renderPage("NRT");
    expect(mocks.tableProps.mock.calls.at(-1)![0].flakyScenariosData).toEqual(FLAKY);
  });

  it("refreshes the list and the suite cards from the refresh button", async () => {
    renderPage("NRT");
    await userEvent.click(screen.getByRole("button", { name: "Aggiorna elenco" }));
    expect(mocks.refetchNrts).toHaveBeenCalledTimes(1);
    expect(mocks.refetchSuites).toHaveBeenCalledTimes(1);
  });

  it("treats a 404 (no runs) as an empty list and any other error as a failure", () => {
    setup(new ApiError(404, null));
    renderPage("NRT");
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("shows the error text for a real failure", () => {
    setup(new ApiError(500, null));
    renderPage("NRT");
    expect(screen.getByText("Errore nel caricamento degli NRT")).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("filters by suite when a suite card is clicked", async () => {
    renderPage("NRT");
    await userEvent.click(screen.getByRole("button", { name: "card-wisp" }));
    expect(mocks.useNrts).toHaveBeenLastCalledWith(expect.objectContaining({ test_object: "wisp", page: 1 }));
  });

  it("renders the summary charts first, then the slot content, then the list", () => {
    renderPage("NRT", <div>slot</div>);
    const order = (el: HTMLElement) => el;
    const charts = order(screen.getByText("Suite — ultimo run"));
    const slot = order(screen.getByText("slot"));
    const list = order(screen.getByText("Elenco run"));
    expect(charts.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(slot.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts the suite filter and the refresh button in the toolbar of the list", () => {
    renderPage("NRT");
    const table = screen.getByTestId("table");
    expect(within(table).getByRole("combobox")).toHaveValue("");
    expect(within(table).getByRole("button", { name: "Aggiorna elenco" })).toBeInTheDocument();
  });

  it("keeps the filter and the refresh button available when the list fails to load", async () => {
    setup(new ApiError(500, null));
    renderPage("NRT");
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Aggiorna elenco" }));
    expect(mocks.refetchNrts).toHaveBeenCalledTimes(1);
  });

  it("shows an empty list, not the deleted rows, when the refetch after a delete answers 404", () => {
    // React Query keeps the previous data when a refetch fails: the 404 must win over it.
    mocks.useNrts.mockReturnValue({
      data: { items: [{ test_run: { id: "gone" } }], total: 1 },
      isLoading: false,
      error: new ApiError(404, null),
      refetch: mocks.refetchNrts,
      isFetching: false,
    });
    renderPage("TAS");
    expect(mocks.tableProps.mock.calls.at(-1)![0].runs).toEqual([]);
    expect(mocks.tableProps.mock.calls.at(-1)![0].totalPages).toBe(0);
    expect(screen.getByText("(0 totali)")).toBeInTheDocument();
  });
});
