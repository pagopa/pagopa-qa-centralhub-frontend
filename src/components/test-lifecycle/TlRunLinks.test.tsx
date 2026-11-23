import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlNrtRunLink } from "@/types/test-lifecycle";
import { TlRunLinks } from "./TlRunLinks";

const mocks = vi.hoisted(() => ({ data: [] as TlNrtRunLink[], perms: new Set(["view:test_lifecycle"]) }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlRunLinks: (_id: string, enabled: boolean) => ({ data: enabled ? mocks.data : undefined }),
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (a: string) => mocks.perms.has(a) }),
}));

describe("TlRunLinks", () => {
  beforeEach(() => {
    mocks.perms = new Set(["view:test_lifecycle"]);
    mocks.data = [
      { execution_id: "e1", feature_id: "f1", feature_code: "FEAT_001_FdR3", scenario_tag: "@FDR3_001_01" },
      { execution_id: "e2", feature_id: "f1", feature_code: "FEAT_001_FdR3", scenario_tag: "@FDR3_001_02" },
      { execution_id: "e3", feature_id: "f2", feature_code: "FEAT_002_FdR3", scenario_tag: "@FDR3_002_01" },
    ];
  });

  it("links each feature of the run with its scenario count", () => {
    render(<TlRunLinks runId="r1" />);
    expect(screen.getByRole("link", { name: "FEAT_001_FdR3" })).toHaveAttribute("href", "/test-lifecycle/f1");
    expect(screen.getByText("2 scenari")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FEAT_002_FdR3" })).toBeInTheDocument();
  });

  it("renders nothing without links or without permission", () => {
    mocks.data = [];
    const { container, rerender } = render(<TlRunLinks runId="r1" />);
    expect(container).toBeEmptyDOMElement();
    mocks.data = [{ execution_id: "e1", feature_id: "f1", feature_code: "X", scenario_tag: "@X" }];
    mocks.perms = new Set();
    rerender(<TlRunLinks runId="r1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
