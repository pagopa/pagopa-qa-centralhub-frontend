import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { TestRunLaunchPanel } from "./TestRunLaunchPanel";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  launchHookArgs: vi.fn(),
  state: {} as Record<string, unknown>,
  runStatus: {} as Record<string, unknown>,
  runsHookArgs: vi.fn(),
  catalog: undefined as unknown,
}));

vi.mock("@/hooks/useQualityGate", () => ({
  useLaunchRun: (...args: unknown[]) => ({
    ...(mocks.launchHookArgs(...args), {}),
    mutate: mocks.mutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    ...mocks.state,
  }),
  useQualityGateSuites: () => ({ data: mocks.catalog }),
  useRuns: (...args: unknown[]) => {
    mocks.runsHookArgs(...args);
    return { data: undefined, isError: false, ...mocks.runStatus };
  },
}));

describe("TestRunLaunchPanel (Quality Gate)", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.launchHookArgs.mockReset();
    mocks.runsHookArgs.mockReset();
    mocks.state = {};
    mocks.runStatus = {};
    mocks.catalog = undefined;
  });

  it("disables launch until the suite name is valid", async () => {
    render(<TestRunLaunchPanel origin="QG" />);
    const button = screen.getByRole("button", { name: "Lancia" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Suite"), "../etc");
    expect(button).toBeDisabled();
  });

  it("submits the normalised request", async () => {
    render(<TestRunLaunchPanel origin="QG" />);
    await userEvent.type(screen.getByLabelText("Suite"), "Checkout");
    await userEvent.selectOptions(screen.getByLabelText("Ambiente"), "dev");
    await userEvent.click(screen.getByRole("button", { name: "Lancia" }));
    expect(mocks.mutate).toHaveBeenCalledWith({
      test_suite: "checkout",
      test_type: "integration",
      environment: "dev",
      tags: "@runnable",
      allure: true,
    });
  });

  const launched = {
    isSuccess: true,
    data: { correlation_id: "qg-abc", run_name: "tas-qg-abc", actions_url: "https://github.com/x/actions" },
  };

  function run(id: string, state: string, conclusion: string | null = null) {
    return {
      correlation_id: `qg-${id}`,
      run_name: `tas-qg-${id}`,
      state,
      conclusion,
      html_url: `https://github.com/x/actions/runs/${id}`,
      created_at: "2026-11-03T10:00:00Z",
      updated_at: null,
    };
  }

  it("shows a just-launched run as starting until GitHub lists it", () => {
    mocks.state = launched;
    render(<TestRunLaunchPanel origin="QG" />);
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("tas-qg-abc");
    expect(item).toHaveTextContent("Avvio in corso");
    expect(screen.getByRole("link", { name: /GitHub Actions/ })).toHaveAttribute("href", "https://github.com/x/actions");
    expect(mocks.runsHookArgs).toHaveBeenCalledWith("QG", "qg-abc");
  });

  it("lists active and recent runs even without a launch in this page", () => {
    mocks.runStatus = { data: [run("1", "in_progress"), run("2", "completed", "failure")] };
    render(<TestRunLaunchPanel origin="QG" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("In esecuzione");
    expect(items[1]).toHaveTextContent("Fallita");
  });

  it.each([
    ["queued", null, "In coda"],
    ["in_progress", null, "In esecuzione"],
    ["completed", "success", "Completata con successo"],
    ["completed", "failure", "Fallita"],
    ["completed", "cancelled", "Annullata"],
  ])("renders the live state %s/%s", (state, conclusion, label) => {
    mocks.runStatus = { data: [run("1", state, conclusion)] };
    render(<TestRunLaunchPanel origin="QG" />);
    expect(screen.getByRole("listitem")).toHaveTextContent(label);
    expect(screen.getByRole("link", { name: /GitHub Actions/ })).toHaveAttribute("href", "https://github.com/x/actions/runs/1");
  });

  it("does not duplicate a launched run once it is listed", () => {
    mocks.state = launched;
    mocks.runStatus = { data: [run("abc", "queued")] };
    render(<TestRunLaunchPanel origin="QG" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("listitem")).toHaveTextContent("In coda");
  });

  it("shows nothing when there are no runs", () => {
    render(<TestRunLaunchPanel origin="QG" />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  describe("with the TAS suite catalog", () => {
    beforeEach(() => {
      mocks.catalog = { available: true, suites: { checkout: ["e2e"], wisp: ["integration", "e2e"] } };
    });

    const typeNames = () => screen.getAllByRole("option", { hidden: true })
      .filter((o) => ["integration", "e2e", "api"].includes(o.textContent ?? ""))
      .map((o) => o.textContent);

    it("offers only the test types the suite has and submits one of them", async () => {
      render(<TestRunLaunchPanel origin="QG" />);
      await userEvent.type(screen.getByLabelText("Suite"), "checkout");
      expect(typeNames()).toEqual(["e2e"]);
      await userEvent.click(screen.getByRole("button", { name: "Lancia" }));
      expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ test_suite: "checkout", test_type: "e2e" }));
    });

    it("keeps every type for a suite that has them all", async () => {
      render(<TestRunLaunchPanel origin="QG" />);
      await userEvent.type(screen.getByLabelText("Suite"), "wisp");
      expect(typeNames()).toEqual(["integration", "e2e"]);
    });

    it("blocks the launch and says so when the suite does not exist in the TAS repository", async () => {
      render(<TestRunLaunchPanel origin="QG" />);
      await userEvent.type(screen.getByLabelText("Suite"), "nope");
      expect(screen.getByRole("status")).toHaveTextContent("non esiste nel repository TAS");
      expect(screen.getByRole("button", { name: "Lancia" })).toBeDisabled();
    });

    it("does not restrict anything when the repository could not be read", async () => {
      mocks.catalog = { available: false, suites: {} };
      render(<TestRunLaunchPanel origin="QG" />);
      await userEvent.type(screen.getByLabelText("Suite"), "anything");
      expect(typeNames()).toEqual(["integration", "e2e", "api"]);
      expect(screen.getByRole("button", { name: "Lancia" })).toBeEnabled();
    });
  });

  it("shows the reason given by the backend when the launch is rejected with 422", () => {
    mocks.state = {
      isError: true,
      error: new ApiError(422, { detail: "Suite 'checkout' has no 'integration' tests (available: e2e)" }),
    };
    render(<TestRunLaunchPanel origin="QG" />);
    expect(screen.getByRole("alert")).toHaveTextContent("available: e2e");
  });
});

describe("TestRunLaunchPanel (TAS)", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.launchHookArgs.mockReset();
    mocks.runsHookArgs.mockReset();
    mocks.state = {};
    mocks.runStatus = {};
    mocks.catalog = undefined;
  });

  it("is labelled for TAS and launches through the TAS hooks", async () => {
    render(<TestRunLaunchPanel origin="TAS" />);
    expect(screen.getByRole("form", { name: "Lancia TAS" })).toBeInTheDocument();
    expect(mocks.launchHookArgs).toHaveBeenCalledWith("TAS");
    await userEvent.type(screen.getByLabelText("Suite"), "checkout");
    await userEvent.click(screen.getByRole("button", { name: "Lancia" }));
    expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ test_suite: "checkout" }));
  });

  it("follows the run it launched with the TAS run name", () => {
    mocks.state = {
      isSuccess: true,
      data: { correlation_id: "a".repeat(32), run_name: `tas-${"a".repeat(32)}`, actions_url: "https://github.com/x/actions" },
    };
    render(<TestRunLaunchPanel origin="TAS" />);
    expect(screen.getByRole("listitem")).toHaveTextContent(`tas-${"a".repeat(32)}`);
    expect(screen.getByRole("list", { name: "Run TAS recenti" })).toBeInTheDocument();
    expect(mocks.runsHookArgs).toHaveBeenCalledWith("TAS", "a".repeat(32));
  });
});
