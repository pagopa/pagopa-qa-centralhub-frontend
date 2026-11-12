import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NrtsListObject } from "@/types";
import { NrtDetailsPanel } from "./NrtDetailsPanel";

vi.mock("./RunModal", () => ({ RunModal: () => null }));

const details: NrtsListObject = {
  test_suite: {
    id: "suite-1",
    test_object: "Test product",
    test_type: "NRT",
    test_object_version: "2.0",
    owner_team: "QA",
  },
  test_run: {
    id: "run-1",
    suite_id: "suite-1",
    scenario_qty: 0,
    passed_scenario: 0,
    failed_scenario: 0,
    broken_scenario: 0,
    skipped_scenario: 0,
    timestamp_start: "2026-11-03T10:00:00Z",
    timestamp_end: "2026-11-03T10:01:00Z",
    duration_ms: 60_000,
    env: "DEV",
    trigger_type: null,
    test_version: "1.0",
    test_origin: "NRT",
    allure_url: null,
    product_issue: " PROD-123 ",
    product_issue_status: null,
    qa_issue: " QA-456 ",
    qa_issue_status: null,
  },
  test_execution: [],
};

function renderPanel(isTasOnly = false, origin?: "TAS" | "QG") {
  const fetchJiraIssue = vi.fn().mockResolvedValue(false);
  const handleIssueInputChange = vi.fn();
  render(
    <NrtDetailsPanel
      details={details}
      isLoading={false}
      hasError={false}
      modified={false}
      onModifiedChange={vi.fn()}
      onSave={vi.fn()}
      isSaving={false}
      hasSaveError={false}
      flakyScenarios={[]}
      setFlakyScenarios={vi.fn()}
      fetchJiraIssue={fetchJiraIssue}
      handleIssueInputChange={handleIssueInputChange}
      handleRevisionNoteChange={vi.fn()}
      isTasOnly={isTasOnly}
      origin={origin}
    />,
  );
  return { fetchJiraIssue, handleIssueInputChange };
}

function getTicketField(label: string) {
  const container = screen.getByText(label).closest("div");
  if (!container) throw new Error(`Missing field container: ${label}`);
  return within(container);
}

describe("NrtDetailsPanel", () => {
  it("hides the product ticket for Quality Gate runs", () => {
    renderPanel(true, "QG");
    expect(screen.queryByText("Ticket prodotto:")).not.toBeInTheDocument();
  });

  it("keeps the product ticket for TAS runs", () => {
    renderPanel(true, "TAS");
    expect(screen.getByText("Ticket prodotto:")).toBeInTheDocument();
  });

  it.each([
    ["product", "Ticket prodotto:", "PROD-123", false, "Ticket QA:"],
    ["qa", "Ticket QA:", "QA-456", true, "Ticket prodotto:"],
  ] as const)("checks the %s Jira ticket on blur and resets only its error", async (field, label, issueId, isQaIssue, otherLabel) => {
    const { fetchJiraIssue, handleIssueInputChange } = renderPanel();
    const ticket = getTicketField(label);
    const otherTicket = getTicketField(otherLabel);
    const input = ticket.getByRole("textbox");

    fireEvent.blur(input);

    expect(await ticket.findByText("Nessuna issue Jira trovata")).toBeInTheDocument();
    expect(fetchJiraIssue).toHaveBeenCalledExactlyOnceWith(issueId, details.test_run, isQaIssue);
    expect(otherTicket.queryByText("Nessuna issue Jira trovata")).not.toBeInTheDocument();

    fireEvent.change(otherTicket.getByRole("textbox"), { target: { value: "OTHER-1" } });
    expect(ticket.getByText("Nessuna issue Jira trovata")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "NEW-1" } });
    expect(ticket.queryByText("Nessuna issue Jira trovata")).not.toBeInTheDocument();
    expect(handleIssueInputChange).toHaveBeenLastCalledWith(expect.anything(), "run-1", field);
  });

  it("renders test object details and hides the QA ticket in TAS mode", () => {
    renderPanel(true);

    expect(getTicketField("Ticket prodotto:").getByRole("textbox")).toHaveValue(" PROD-123 ");
    expect(screen.queryByText("Ticket QA:")).not.toBeInTheDocument();
    expect(screen.getByText("Test object")).toBeInTheDocument();
    expect(screen.getByText("Test product")).toBeInTheDocument();
    expect(screen.getByText("Versione test object")).toBeInTheDocument();
    expect(screen.getByText("2.0")).toBeInTheDocument();
  });

  it.each([
    ["NRT", false, undefined],
    ["TAS", true, "TAS"],
    ["Quality Gate", true, "QG"],
  ] as const)("does not repeat the Allure and AI Analysis links in the %s detail (they are row icons)", (_name, isTasOnly, origin) => {
    renderPanel(isTasOnly, origin);
    expect(screen.queryByText(/Allure/)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI Analysis/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it.each([
    ["NRT", false, undefined, /^Scenari/],
    ["TAS", true, "TAS", /^Scenari/],
    ["Quality Gate", true, "QG", /^Scenari falliti/],
  ] as const)("keeps the scenarios title of the %s detail one line away from the content above", (_name, isTasOnly, origin, title) => {
    renderPanel(isTasOnly, origin);
    const heading = screen.getByRole("heading", { name: title });
    expect(heading.parentElement).toHaveClass("mt-5");
  });
});
