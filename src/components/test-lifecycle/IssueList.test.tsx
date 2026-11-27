import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TlIssue } from "@/types/test-lifecycle";
import { IssueList } from "./IssueList";

const UNMANAGED: TlIssue = {
  id: "i1",
  kind: "unmanaged_file",
  status: "open",
  feature_id: null,
  feature_code: null,
  feature_title: null,
  revision_id: null,
  path: "src/integration/fdr3/feature/nuovo.feature",
  commit_sha: "abc",
  detail: { key: "unmanaged", scope_code: "FdR3", title: "Nuovo", scenarios: 2, parse_errors: [] },
  created_at: "2026-11-27T10:00:00Z",
  updated_at: "2026-11-27T10:00:00Z",
  updated_by: null,
};

describe("IssueList", () => {
  it("explains an unmanaged file: no header, nobody manages it", () => {
    render(<IssueList issues={[UNMANAGED]} canManage onUpdate={vi.fn()} />);
    expect(screen.getByText("File non gestito")).toBeInTheDocument();
    expect(screen.getByText(UNMANAGED.path!)).toBeInTheDocument();
    expect(screen.getByText(/nessuna feature lo gestisce/i)).toBeInTheDocument();
  });

  it("names the scope the folder suggests", () => {
    render(<IssueList issues={[UNMANAGED]} canManage onUpdate={vi.fn()} />);
    expect(screen.getByText(/ambito FdR3/)).toBeInTheDocument();
  });

  it("offers to import an unmanaged file and reports the chosen issue", async () => {
    const onImport = vi.fn();
    render(<IssueList issues={[UNMANAGED]} canManage onUpdate={vi.fn()} onImport={onImport} />);
    await userEvent.click(screen.getByRole("button", { name: "Importa nell'hub" }));
    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({ id: "i1" }));
  });

  it("does not offer the import without the permission or on other kinds", () => {
    const { rerender } = render(
      <IssueList issues={[UNMANAGED]} canManage={false} onUpdate={vi.fn()} onImport={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Importa nell'hub" })).toBeNull();
    rerender(
      <IssueList
        issues={[{ ...UNMANAGED, kind: "parse_error" }]}
        canManage
        onUpdate={vi.fn()}
        onImport={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Importa nell'hub" })).toBeNull();
  });

  it("offers the import for a file whose header names an unknown code", () => {
    render(
      <IssueList
        issues={[{ ...UNMANAGED, kind: "unknown_feature_code" }]}
        canManage
        onUpdate={vi.fn()}
        onImport={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Importa nell'hub" })).toBeInTheDocument();
  });

  it("explains a lost header and offers to restore it", async () => {
    const onRestoreHeader = vi.fn();
    const lost: TlIssue = {
      ...UNMANAGED,
      id: "i2",
      kind: "missing_header",
      feature_id: "f1",
      feature_code: "FEAT_001_FdR3",
      detail: { key: "missing_header", code: "FEAT_001_FdR3" },
    };
    render(<IssueList issues={[lost]} canManage onUpdate={vi.fn()} onRestoreHeader={onRestoreHeader} />);
    expect(screen.getByText("Intestazione mancante")).toBeInTheDocument();
    expect(screen.getByText(/ha perso l'intestazione/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ripristina intestazione" }));
    expect(onRestoreHeader).toHaveBeenCalledWith(expect.objectContaining({ id: "i2" }));
  });

  it("does not offer the restore on other kinds", () => {
    render(<IssueList issues={[UNMANAGED]} canManage onUpdate={vi.fn()} onRestoreHeader={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Ripristina intestazione" })).toBeNull();
  });
});
