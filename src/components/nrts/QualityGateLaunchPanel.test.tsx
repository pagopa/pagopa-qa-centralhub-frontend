import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QualityGateLaunchPanel } from "./QualityGateLaunchPanel";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: {} as Record<string, unknown>,
  runStatus: {} as Record<string, unknown>,
}));

vi.mock("@/hooks/useQualityGate", () => ({
  useLaunchQualityGateRun: () => ({
    mutate: mocks.mutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    ...mocks.state,
  }),
  useQualityGateRunStatus: () => ({ data: undefined, isError: false, ...mocks.runStatus }),
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

  function status(state: string, conclusion: string | null = null) {
    return {
      data: {
        correlation_id: "qg-abc",
        run_name: "tas-qg-abc",
        state,
        conclusion,
        html_url: "https://github.com/x/actions/runs/1",
        created_at: null,
        updated_at: null,
      },
    };
  }

  it("shows the run name, a starting state and the Actions link after a launch", () => {
    mocks.state = launched;
    render(<QualityGateLaunchPanel />);
    expect(screen.getByRole("status")).toHaveTextContent("tas-qg-abc");
    expect(screen.getByRole("status")).toHaveTextContent("Avvio in corso");
    expect(screen.getByRole("link", { name: /GitHub Actions/ })).toHaveAttribute("href", "https://github.com/x/actions");
  });

  it.each([
    ["queued", null, "In coda"],
    ["in_progress", null, "In esecuzione"],
    ["completed", "success", "Completata con successo"],
    ["completed", "failure", "Fallita"],
    ["completed", "cancelled", "Annullata"],
  ])("renders the live state %s/%s", (state, conclusion, label) => {
    mocks.state = launched;
    mocks.runStatus = status(state, conclusion);
    render(<QualityGateLaunchPanel />);
    expect(screen.getByRole("status")).toHaveTextContent(label);
    expect(screen.getByRole("link", { name: /GitHub Actions/ })).toHaveAttribute("href", "https://github.com/x/actions/runs/1");
  });
});
