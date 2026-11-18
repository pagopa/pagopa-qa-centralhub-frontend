import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VersionCell } from "@/components/release-status/VersionCell";
import type { Cell } from "@/types/release-status";

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

describe("VersionCell", () => {
  it("shows the manual icon for a manually entered version", () => {
    render(<VersionCell target="DEV" cell={makeCell({ read_status: "MANUAL" })} />);

    expect(screen.getByRole("img", { name: "versione inserita a mano" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "versione letta" })).not.toBeInTheDocument();
    expect(screen.getByText("1.4.2")).toBeInTheDocument();
  });

  it("shows a readable version with the read icon and the equal marker", () => {
    render(<VersionCell target="DEV" cell={makeCell()} />);

    expect(screen.getByText("1.4.2")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "versione letta" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "allineata al repository" })).toBeInTheDocument();
  });

  it("stacks the icons and the adornment above the full version", () => {
    render(
      <VersionCell
        target="UAT"
        cell={makeCell({ version: "1.4.2-SNAPSHOT-build.12345" })}
        stacked
        adornment={<span>markers</span>}
      />,
    );

    const version = screen.getByText("1.4.2-SNAPSHOT-build.12345");
    expect(version).toHaveClass("break-all");
    expect(version).not.toHaveClass("truncate");
    const iconLine = screen.getByRole("img", { name: "versione letta" }).closest("div");
    expect(iconLine).toContainElement(screen.getByText("markers"));
    expect(iconLine).not.toContainElement(version);
  });

  it("greys out the last known version when the endpoint fails", () => {
    render(
      <VersionCell
        target="UAT"
        cell={makeCell({ read_status: "ERROR", error_detail: "timeout", drift: null })}
      />,
    );

    expect(screen.getByText("1.4.2")).toHaveClass("text-text-muted");
    expect(screen.getByRole("img", { name: "endpoint non raggiungibile" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "versione letta" })).not.toBeInTheDocument();
  });

  it("shows a down arrow when the environment is behind the repository", () => {
    render(<VersionCell target="PROD" cell={makeCell({ version: "1.4.1", drift: "BEHIND" })} />);

    expect(screen.getByRole("img", { name: "indietro rispetto al repository" })).toBeInTheDocument();
  });

  it("shows an up arrow when the environment is ahead of the repository", () => {
    render(<VersionCell target="DEV" cell={makeCell({ version: "1.5.0", drift: "AHEAD" })} />);

    expect(screen.getByRole("img", { name: "avanti rispetto al repository" })).toBeInTheDocument();
  });

  it("warns when the endpoint returns no version", () => {
    render(<VersionCell target="DEV" cell={makeCell({ version: null, read_status: "NO_VERSION", drift: null })} />);

    expect(screen.getByRole("img", { name: "versione non disponibile" })).toBeInTheDocument();
  });

  it("marks non-standard versions with the info icon", () => {
    render(<VersionCell target="DEV" cell={makeCell({ version: "latest", drift: "UNKNOWN" })} />);

    expect(screen.getByRole("img", { name: "versione non standard" })).toBeInTheDocument();
  });
});
