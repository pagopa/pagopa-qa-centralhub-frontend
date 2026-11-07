import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QualityGateLaunchPanel } from "./QualityGateLaunchPanel";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), state: {} as Record<string, unknown> }));

vi.mock("@/hooks/useQualityGate", () => ({
  useLaunchQualityGateRun: () => ({
    mutate: mocks.mutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    ...mocks.state,
  }),
}));

describe("QualityGateLaunchPanel", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.state = {};
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

  it("shows the run name and the Actions link after a launch", () => {
    mocks.state = {
      isSuccess: true,
      data: { correlation_id: "abc", run_name: "tas-abc", actions_url: "https://github.com/x/actions" },
    };
    render(<QualityGateLaunchPanel />);
    expect(screen.getByRole("status")).toHaveTextContent("tas-abc");
    expect(screen.getByRole("link", { name: /GitHub Actions/ })).toHaveAttribute("href", "https://github.com/x/actions");
  });
});
