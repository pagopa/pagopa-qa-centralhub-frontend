import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlakyScenarioRow } from "@/types/flaky";
import type { FlakyScenario, NrtsListObject, TestExecution } from "@/types";
import { NrtDetailsPanel } from "./NrtDetailsPanel";

vi.mock("./RunModal", () => ({ RunModal: () => null }));

const flaky = vi.hoisted(() => ({ scores: vi.fn() }));
vi.mock("@/hooks/useFlaky", () => ({
  useRunScenarioScores: flaky.scores,
  flakyScoreKey: (testType: string, name: string) => `${testType}|${name}`,
}));

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

function renderPanel(
  isTasOnly = false,
  origin?: "TAS" | "QG",
  note: string | null = null,
  panelDetails: NrtsListObject = details,
  flakyScenarios: FlakyScenario[] = [],
) {
  const setFlakyScenarios = vi.fn();
  const fetchJiraIssue = vi.fn().mockResolvedValue(false);
  const handleIssueInputChange = vi.fn();
  const handleRunNoteChange = vi.fn();
  const onModifiedChange = vi.fn();
  render(
    <NrtDetailsPanel
      details={note === null ? panelDetails : { ...panelDetails, test_run: { ...panelDetails.test_run, note } }}
      isLoading={false}
      hasError={false}
      modified={false}
      onModifiedChange={onModifiedChange}
      onSave={vi.fn()}
      isSaving={false}
      hasSaveError={false}
      flakyScenarios={flakyScenarios}
      setFlakyScenarios={setFlakyScenarios}
      fetchJiraIssue={fetchJiraIssue}
      handleIssueInputChange={handleIssueInputChange}
      handleRevisionNoteChange={vi.fn()}
      handleRunNoteChange={handleRunNoteChange}
      isTasOnly={isTasOnly}
      origin={origin}
    />,
  );
  return { fetchJiraIssue, handleIssueInputChange, handleRunNoteChange, onModifiedChange, setFlakyScenarios };
}

function getTicketField(label: string) {
  const container = screen.getByText(label).closest("div");
  if (!container) throw new Error(`Missing field container: ${label}`);
  return within(container);
}

beforeEach(() => {
  flaky.scores.mockReset();
  flaky.scores.mockReturnValue({ scores: new Map(), env: "DEV", isLoading: false });
});

describe("NrtDetailsPanel", () => {
  it("hides the product ticket for Quality Gate runs", () => {
    renderPanel(true, "QG");
    expect(screen.queryByText("Ticket prodotto")).not.toBeInTheDocument();
  });

  it("hides the product ticket for TAS runs, which are read-only", () => {
    renderPanel(true, "TAS");
    expect(screen.queryByText("Ticket prodotto")).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket QA")).not.toBeInTheDocument();
  });

  it.each([
    ["product", "Ticket prodotto", "PROD-123", false, "Ticket QA"],
    ["qa", "Ticket QA", "QA-456", true, "Ticket prodotto"],
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

  it("extracts the key from a pasted Jira URL before checking the ticket", async () => {
    const pasted = {
      ...details,
      test_run: {
        ...details.test_run,
        qa_issue: "https://pagopa.atlassian.net/browse/pq-456?focusedCommentId=1",
      },
    };
    const { fetchJiraIssue } = renderPanel(false, undefined, null, pasted);

    fireEvent.blur(getTicketField("Ticket QA").getByRole("textbox"));

    await waitFor(() => expect(fetchJiraIssue).toHaveBeenCalledOnce());
    expect(fetchJiraIssue).toHaveBeenCalledWith("PQ-456", pasted.test_run, true);
  });

  it("flags text that is neither a key nor a Jira URL without calling the lookup", async () => {
    const invalid = { ...details, test_run: { ...details.test_run, qa_issue: "hello" } };
    const { fetchJiraIssue } = renderPanel(false, undefined, null, invalid);
    const ticket = getTicketField("Ticket QA");

    fireEvent.blur(ticket.getByRole("textbox"));

    expect(await ticket.findByText("Nessuna issue Jira trovata")).toBeInTheDocument();
    expect(fetchJiraIssue).not.toHaveBeenCalled();
  });

  it("renders test object details and hides both tickets in TAS mode", () => {
    renderPanel(true);

    expect(screen.queryByText("Ticket prodotto")).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket QA")).not.toBeInTheDocument();
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
    const nonJiraLinks = screen.queryAllByRole("link").filter((link) => link.getAttribute("aria-label") !== "Apri ticket Jira");
    expect(nonJiraLinks).toHaveLength(0);
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

  it("lets the user write a general note on an NRT run", () => {
    const { handleRunNoteChange, onModifiedChange } = renderPanel(false, undefined, "existing note");
    const note = screen.getByRole("textbox", { name: "Note della run" });
    expect(note).toHaveValue("existing note");
    fireEvent.change(note, { target: { value: "new note" } });
    expect(handleRunNoteChange).toHaveBeenCalledTimes(1);
    expect(handleRunNoteChange.mock.calls[0][0]).toMatchObject({ test_run: { id: "run-1" } });
    expect(onModifiedChange).toHaveBeenCalledWith(true);
  });

  it("shows an empty note field for a run without note", () => {
    renderPanel(false);
    expect(screen.getByRole("textbox", { name: "Note della run" })).toHaveValue("");
  });

  it.each([
    ["TAS", "TAS"],
    ["Quality Gate", "QG"],
  ] as const)("has no run note on the %s detail", (_name, origin) => {
    renderPanel(true, origin);
    expect(screen.queryByRole("textbox", { name: "Note della run" })).not.toBeInTheDocument();
  });

  it("keeps the note above the scenarios title", () => {
    renderPanel(false);
    const note = screen.getByRole("textbox", { name: "Note della run" });
    const heading = screen.getByRole("heading", { name: /^Scenari/ });
    expect(note.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

function execution(
  id: string,
  name: string,
  overrides: Partial<Omit<TestExecution, "status">> & { status?: string } = {},
): TestExecution {
  // The API sends upper-case statuses (PASSED, FAILED, BROKEN) although the type says lower case.
  return {
    id, run_id: "run-1", allure_id: null, status: "FAILED", scenario_name: name, duration_ms: 4120,
    error_message: "AssertionError: expected 200 but was 503", retries: 1, revision_note: null,
    allure_url: "https://allure/x", ...overrides,
  } as TestExecution;
}

function scoreRow(name: string, overrides: Partial<FlakyScenarioRow> = {}): FlakyScenarioRow {
  return {
    test_object: "Test product", test_type: "NRT", scenario_name: name, env: "DEV", score: 62, level: 5,
    state: "OK", flip_rate: 0.6, retry_pass_rate: 0.1, runs_analyzed: 25, last_failure_at: null,
    recent_outcomes: [], last_suite_id: null, is_flaky: false, flagged_by: null, flagged_at: null,
    hint: "to_mark", ...overrides,
  };
}

const withScenarios: NrtsListObject = {
  ...details,
  test_execution: [
    execution("e1", "Flaky one"),
    execution("e2", "Already flagged", { status: "BROKEN", duration_ms: 30000 }),
    execution("e3", "Stable one"),
    execution("e4", "Passed one", { status: "PASSED" }),
  ],
};

describe("NrtDetailsPanel redesign", () => {
  beforeEach(() => {
    flaky.scores.mockReturnValue({
      env: "DEV",
      isLoading: false,
      scores: new Map([
        ["NRT|Flaky one", scoreRow("Flaky one")],
        ["NRT|Already flagged", scoreRow("Already flagged", { level: 4, score: 38, hint: "to_mark" })],
        ["NRT|Stable one", scoreRow("Stable one", { level: 1, score: 0, hint: null })],
      ]),
    });
  });

  it("groups the run information in Suite, Run and Revisione cards", () => {
    renderPanel();
    for (const title of ["Suite", "Run", "Revisione"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("asks the flakiness of the non-passed scenarios in the run environment", () => {
    renderPanel(false, undefined, null, withScenarios);
    expect(flaky.scores).toHaveBeenCalledWith({
      env: "DEV", testObject: "Test product", scenarioNames: ["Flaky one", "Already flagged", "Stable one"],
    });
  });

  it("shows the flakiness indicator per scenario and suggests marking the very flaky ones", () => {
    const flagged: FlakyScenario = {
      suite_id: "suite-1", test_object: "Test product", test_type: "NRT", scenario_name: "Already flagged",
      test_object_version: "2.0", test_version: "1.0", inserted_at: null, is_flaky: true,
    };
    renderPanel(false, undefined, null, withScenarios, [flagged]);

    expect(screen.getByRole("columnheader", { name: "Flakiness DEV" })).toBeInTheDocument();
    const flakyRow = screen.getByRole("row", { name: /Flaky one/ });
    expect(within(flakyRow).getByRole("img", { name: "Flakiness livello 5 su 5, punteggio 62" })).toBeInTheDocument();
    expect(within(flakyRow).getByText("Da marcare")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Already flagged/ })).queryByText("Da marcare")).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Passed one/ })).not.toBeInTheDocument();

    expect(screen.getByText("1 da marcare flaky")).toBeInTheDocument();
    expect(screen.getByText("1 già marcato")).toBeInTheDocument();
    expect(screen.getByText("1 stabile: probabile regressione")).toBeInTheDocument();
  });

  it("shows Dati insuff. for scenarios without a score", () => {
    flaky.scores.mockReturnValue({ env: "DEV", isLoading: false, scores: new Map() });
    renderPanel(false, undefined, null, withScenarios);
    expect(within(screen.getByRole("row", { name: /Flaky one/ })).getByText("Dati insuff.")).toBeInTheDocument();
    expect(screen.queryByText(/da marcare flaky/)).not.toBeInTheDocument();
  });

  it.each([["TAS", "TAS"], ["Quality Gate", "QG"]] as const)(
    "shows the indicator also in the %s detail, without flag and note",
    (_name, origin) => {
      renderPanel(true, origin, null, withScenarios);
      expect(screen.getByRole("columnheader", { name: "Flakiness DEV" })).toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    },
  );

  it("renders status badges, seconds and the full error on hover", () => {
    renderPanel(false, undefined, null, withScenarios);
    const row = screen.getByRole("row", { name: /Already flagged/ });
    expect(within(row).getByText("BROKEN")).toHaveAttribute("data-status", "BROKEN");
    expect(within(row).getByText("30,0 s")).toBeInTheDocument();
    expect(within(row).getByText("AssertionError: expected 200 but was 503")).toHaveAttribute(
      "title", "AssertionError: expected 200 but was 503",
    );
  });

  it("toggles the flaky flag with a switch", () => {
    const { setFlakyScenarios, onModifiedChange } = renderPanel(false, undefined, null, withScenarios);
    fireEvent.click(screen.getByRole("switch", { name: "Flaky: Flaky one" }));
    expect(setFlakyScenarios).toHaveBeenCalledWith([expect.objectContaining({ scenario_name: "Flaky one", is_flaky: true })]);
    expect(onModifiedChange).toHaveBeenCalledWith(true);
  });
});
