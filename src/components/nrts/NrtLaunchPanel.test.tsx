import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { NrtLaunchPanel } from "./NrtLaunchPanel";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  launchHookArgs: vi.fn(),
  runsHookArgs: vi.fn(),
  state: {} as Record<string, unknown>,
  runStatus: {} as Record<string, unknown>,
  options: undefined as unknown,
}));

vi.mock("@/hooks/useQualityGate", () => ({
  useLaunchRun: (...args: unknown[]) => {
    mocks.launchHookArgs(...args);
    return { mutate: mocks.mutate, isPending: false, isSuccess: false, isError: false, ...mocks.state };
  },
  useRuns: (...args: unknown[]) => {
    mocks.runsHookArgs(...args);
    return { data: undefined, isError: false, ...mocks.runStatus };
  },
  useNrtLaunchOptions: () => ({ data: mocks.options }),
}));

const OPTIONS = {
  available: true,
  suites: [
    { id: "wisp", label: "WISP", envs: ["dev", "uat"] },
    { id: "checkout", label: "Checkout E2E", envs: ["uat"] },
  ],
};

const launchButton = () => screen.getByRole("button", { name: "Lancia" });

describe("NrtLaunchPanel", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.launchHookArgs.mockReset();
    mocks.runsHookArgs.mockReset();
    mocks.state = {};
    mocks.runStatus = {};
    mocks.options = OPTIONS;
  });

  it("launches through the NRT hooks", () => {
    render(<NrtLaunchPanel />);
    expect(screen.getByRole("form", { name: "Lancia NRT" })).toBeInTheDocument();
    expect(mocks.launchHookArgs).toHaveBeenCalledWith("NRT");
    expect(mocks.runsHookArgs).toHaveBeenCalledWith("NRT", undefined);
  });

  it("selects every suite by default and asks for confirmation before launching them all", async () => {
    render(<NrtLaunchPanel />);
    expect(screen.getByRole("checkbox", { name: "Tutte le suite" })).toBeChecked();
    await userEvent.click(launchButton());
    expect(mocks.mutate).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Lanciare tutte le suite NRT su uat?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Conferma" }));
    expect(mocks.mutate).toHaveBeenCalledWith({ suites: "all", target_env: "uat" });
  });

  it("does not launch when the confirmation is cancelled", async () => {
    render(<NrtLaunchPanel />);
    await userEvent.click(launchButton());
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Annulla" }));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("launches the selected suites without confirmation", async () => {
    render(<NrtLaunchPanel />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Tutte le suite" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "WISP" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Checkout E2E" }));
    await userEvent.click(launchButton());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.mutate).toHaveBeenCalledWith({ suites: ["wisp", "checkout"], target_env: "uat" });
  });

  it("disables the launch while no suite is selected", async () => {
    render(<NrtLaunchPanel />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Tutte le suite" }));
    expect(launchButton()).toBeDisabled();
  });

  it("offers only the suites the environment supports and drops selections that no longer apply", async () => {
    render(<NrtLaunchPanel />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Tutte le suite" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Checkout E2E" }));
    await userEvent.selectOptions(screen.getByLabelText("Ambiente"), "dev");
    expect(screen.queryByRole("checkbox", { name: "Checkout E2E" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "WISP" })).toBeInTheDocument();
    // The hidden suite is not sent and nothing else is selected, so the launch is blocked.
    expect(launchButton()).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "WISP" }));
    await userEvent.click(launchButton());
    expect(mocks.mutate).toHaveBeenCalledWith({ suites: ["wisp"], target_env: "dev" });
  });

  it("falls back to typing the suite ids when the registry could not be read", async () => {
    mocks.options = { available: false, suites: [] };
    render(<NrtLaunchPanel />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Tutte le suite" }));
    const input = screen.getByLabelText(/Suite \(id separati da virgola\)/);
    await userEvent.type(input, "wisp, checkout");
    await userEvent.click(launchButton());
    expect(mocks.mutate).toHaveBeenCalledWith({ suites: ["wisp", "checkout"], target_env: "uat" });
  });

  it("blocks typed suite ids that are not valid", async () => {
    mocks.options = { available: false, suites: [] };
    render(<NrtLaunchPanel />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Tutte le suite" }));
    await userEvent.type(screen.getByLabelText(/Suite \(id separati da virgola\)/), "Bad Suite");
    expect(launchButton()).toBeDisabled();
  });

  it("shows the reason given by the backend when the launch is rejected with 422", () => {
    mocks.state = { isError: true, error: new ApiError(422, { detail: "Unknown suite(s): nope" }) };
    render(<NrtLaunchPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("Unknown suite(s): nope");
  });

  it("follows the NRT run it launched until GitHub lists it", () => {
    const id = "a".repeat(32);
    mocks.state = {
      isSuccess: true,
      data: { correlation_id: id, run_name: `nrt-${id}`, actions_url: "https://github.com/x/actions" },
    };
    render(<NrtLaunchPanel />);
    expect(screen.getByRole("listitem")).toHaveTextContent(`nrt-${id}`);
    expect(screen.getByRole("listitem")).toHaveTextContent("Avvio in corso");
    expect(screen.getByRole("list", { name: "Run NRT recenti" })).toBeInTheDocument();
    expect(mocks.runsHookArgs).toHaveBeenCalledWith("NRT", id);
  });
});
