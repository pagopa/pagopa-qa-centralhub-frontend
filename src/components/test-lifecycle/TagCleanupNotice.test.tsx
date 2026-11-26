import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlTagCleanup } from "@/types/test-lifecycle";
import { TagCleanupNotice } from "./TagCleanupNotice";

const mocks = vi.hoisted(() => ({
  data: undefined as TlTagCleanup | undefined,
  apply: vi.fn(),
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlTagCleanup: () => ({ data: mocks.data }),
  useApplyTlTagCleanup: () => ({ mutateAsync: mocks.apply, isPending: false }),
}));

const CLEANUP: TlTagCleanup = {
  rows: [
    { scenario_tag: "@FDR3_001_01", tags: ["e2e"] },
    { scenario_tag: "@FDR3_001_03", tags: ["e2e"] },
  ],
  proposed_test_type: "e2e",
  conflict: null,
};

const afterPendingWrites = <T,>(fn: () => Promise<T>) => fn();

function renderNotice(props: { editable?: boolean; onApplied?: () => void } = {}) {
  const onApplied = props.onApplied ?? vi.fn();
  render(
    <TagCleanupNotice
      featureId="f1"
      editable={props.editable ?? true}
      afterPendingWrites={afterPendingWrites}
      onApplied={onApplied}
    />,
  );
  return { onApplied };
}

describe("TagCleanupNotice", () => {
  beforeEach(() => {
    mocks.apply.mockReset().mockResolvedValue(undefined);
    mocks.data = CLEANUP;
  });

  it("renders nothing when there is nothing to clean", () => {
    mocks.data = { rows: [], proposed_test_type: null, conflict: null };
    const { container } = render(
      <TagCleanupNotice featureId="f1" editable afterPendingWrites={afterPendingWrites} onApplied={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while loading or when the feature is not editable", () => {
    mocks.data = undefined;
    const first = render(
      <TagCleanupNotice featureId="f1" editable afterPendingWrites={afterPendingWrites} onApplied={vi.fn()} />,
    );
    expect(first.container).toBeEmptyDOMElement();
    mocks.data = CLEANUP;
    const second = render(
      <TagCleanupNotice featureId="f1" editable={false} afterPendingWrites={afterPendingWrites} onApplied={vi.fn()} />,
    );
    expect(second.container).toBeEmptyDOMElement();
  });

  it("explains what will change", () => {
    renderNotice();
    expect(screen.getByText(/2 scenari hanno tag di test-type/i)).toBeInTheDocument();
    expect(screen.getByText(/il test-type appartiene al file/i)).toBeInTheDocument();
    expect(screen.getByText("@e2e", { selector: "strong" })).toBeInTheDocument();
  });

  it("applies the cleanup after the pending writes and then tells the page", async () => {
    const { onApplied } = renderNotice();
    await userEvent.click(screen.getByRole("button", { name: "Applica pulizia" }));
    expect(mocks.apply).toHaveBeenCalledWith("f1");
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it("disables the button and says why when the types disagree", () => {
    mocks.data = { ...CLEANUP, proposed_test_type: null, conflict: "I tag di test-type degli scenari non coincidono: @api, @e2e" };
    renderNotice();
    expect(screen.getByRole("button", { name: "Applica pulizia" })).toBeDisabled();
    expect(screen.getByText(/non coincidono/)).toBeInTheDocument();
  });

  it("shows a failure instead of reloading", async () => {
    mocks.apply.mockRejectedValue(new Error("boom"));
    const { onApplied } = renderNotice();
    await userEvent.click(screen.getByRole("button", { name: "Applica pulizia" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onApplied).not.toHaveBeenCalled();
  });
});
