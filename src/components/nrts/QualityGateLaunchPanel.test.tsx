import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QualityGateLaunchPanel } from "./QualityGateLaunchPanel";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: {} as Record<string, unknown>,
  runStatus: {} as Record<string, unknown>,
  runsHookArgs: vi.fn(),
}));

vi.mock("@/hooks/useQualityGate", () => ({
  useLaunchQualityGateRun: () => ({
    mutate: mocks.mutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    ...mocks.state,
  }),
  useQualityGateRuns: (...args: unknown[]) => {
    mocks.runsHookArgs(...args);
    return { data: undefined, isError: false, ...mocks.runStatus };
  },
}));

describe("QualityGateLaunchPanel", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.state = {};
    mocks.runStatus = {};
  });

  it("disables launch until the suite name is valid", async () => {
    render(<QualityGateLaunchPanel />);
    const button = screen.getByRole("button", { name: "Lancia" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Suite"), "../etc");
    expect(button).toBeDisabled();
  });

  it("submits the normalised request", async () => {
    render(<QualityGateLaunchPanel />);
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
    render(<QualityGateLaunchPanel />);
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("tas-qg-abc");
    expect(item).toHaveTextContent("Avvio in corso");
    expect(screen.getByRole("link", { name: /GitHub Actions/ })).toHaveAttribute("href", "https://github.com/x/actions");
    expect(mocks.runsHookArgs).toHaveBeenCalledWith("qg-abc");
  });

  it("lists active and recent runs even without a launch in this page", () => {
    mocks.runStatus = { data: [run("1", "in_progress"), run("2", "completed", "failure")] };
    render(<QualityGateLaunchPanel />);
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
    render(<QualityGateLaunchPanel />);
    expect(screen.getByRole("listitem")).toHaveTextContent(label);
    expect(screen.getByRole("link", { name: /GitHub Actions/ })).toHaveAttribute("href", "https://github.com/x/actions/runs/1");
  });

  it("does not duplicate a launched run once it is listed", () => {
    mocks.state = launched;
    mocks.runStatus = { data: [run("abc", "queued")] };
    render(<QualityGateLaunchPanel />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("listitem")).toHaveTextContent("In coda");
  });

  it("shows nothing when there are no runs", () => {
    render(<QualityGateLaunchPanel />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
