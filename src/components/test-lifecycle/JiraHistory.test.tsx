import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TlJiraHistoryRow, TlJiraLink } from "@/types/test-lifecycle";
import { JiraHistory } from "./JiraHistory";

function link(role: TlJiraLink["role"], key: string, o: Partial<TlJiraLink> = {}): TlJiraLink {
  return {
    role, key, summary: `Titolo ${key}`, status: "In corso", category: "indeterminate",
    url: `https://jira.test/browse/${key}`, verified: true, ...o,
  };
}

function row(o: Partial<TlJiraHistoryRow>): TlJiraHistoryRow {
  return {
    revision_number: 1, revision_status: "merged", is_current: false,
    design: null, impl: null, qa_epic: null, ...o,
  };
}

const rows: TlJiraHistoryRow[] = [
  row({
    revision_number: 2, revision_status: "draft", is_current: true,
    design: link("design", "PQ-20"), qa_epic: link("qa_epic", "PQ-495", { category: "done", status: "Done" }),
  }),
  row({
    revision_number: 1,
    design: link("design", "PQ-12"), impl: link("impl", "PQ-13", { url: "javascript:alert(1)" }),
    qa_epic: link("qa_epic", "PQ-495"),
  }),
];

describe("JiraHistory", () => {
  it("renders one row per revision, newest first", () => {
    render(<JiraHistory rows={rows} />);
    const body = screen.getAllByTestId(/^jira-history-row-/);
    expect(body.map((r) => r.getAttribute("data-testid"))).toEqual([
      "jira-history-row-2", "jira-history-row-1",
    ]);
    expect(within(body[0]).getByText("Rev. 2")).toBeInTheDocument();
    expect(within(body[1]).getByText("Rev. 1")).toBeInTheDocument();
  });

  it("shows key, summary and status text for each task, linking only http(s) urls", () => {
    render(<JiraHistory rows={rows} />);
    const first = screen.getByTestId("jira-history-row-1");
    const design = within(first).getByRole("link", { name: "PQ-12" });
    expect(design).toHaveAttribute("href", "https://jira.test/browse/PQ-12");
    expect(design).toHaveAttribute("target", "_blank");
    expect(within(first).getByText("Titolo PQ-12")).toBeInTheDocument();
    expect(within(first).queryByRole("link", { name: "PQ-13" })).toBeNull();
    expect(within(first).getByText("PQ-13")).toBeInTheDocument();
    expect(within(screen.getByTestId("jira-history-row-2")).getByText("Fatto")).toBeInTheDocument();
  });

  it("shows a dash where a revision has no task", () => {
    render(<JiraHistory rows={rows} />);
    expect(within(screen.getByTestId("jira-history-row-2")).getAllByText("—")).toHaveLength(1);
  });

  it("names the table and reads empty cells aloud", () => {
    render(<JiraHistory rows={rows} />);
    expect(screen.getByRole("table", { name: "Storico Jira per revisione" })).toBeInTheDocument();
    expect(within(screen.getByTestId("jira-history-row-2")).getByText("Nessun task")).toBeInTheDocument();
  });

  it("marks the revision being worked on with text, not colour alone", () => {
    render(<JiraHistory rows={rows} />);
    expect(within(screen.getByTestId("jira-history-row-2")).getByText("In lavorazione")).toBeInTheDocument();
    expect(within(screen.getByTestId("jira-history-row-1")).queryByText("In lavorazione")).toBeNull();
  });

  it("calls the current published revision Corrente, not In lavorazione", () => {
    render(<JiraHistory rows={[row({ revision_number: 1, is_current: true, revision_status: "merged" })]} />);
    expect(screen.getByText("Corrente")).toBeInTheDocument();
    expect(screen.queryByText("In lavorazione")).toBeNull();
  });

  it("renders an empty state without rows", () => {
    render(<JiraHistory rows={[]} />);
    expect(screen.getByText("Nessun task Jira collegato")).toBeInTheDocument();
  });
});
