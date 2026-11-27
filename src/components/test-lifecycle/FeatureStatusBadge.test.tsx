import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureStatusBadge } from "./FeatureStatusBadge";

describe("FeatureStatusBadge", () => {
  it("shows only the status when NRT does not run the feature", () => {
    render(<FeatureStatusBadge status="draft" />);
    expect(screen.getByText("Bozza")).toBeInTheDocument();
    expect(screen.queryByText("In esecuzione NRT")).toBeNull();
  });

  it("adds the NRT badge next to the status, whatever the status", () => {
    render(<FeatureStatusBadge status="draft" running />);
    expect(screen.getByText("Bozza")).toBeInTheDocument();
    expect(screen.getByText("In esecuzione NRT")).toBeInTheDocument();
  });
});
