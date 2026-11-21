import { describe, expect, it } from "vitest";
import { buildJiraIssueUrl, parseJiraIssueKey } from "./jiraIssue";

describe("parseJiraIssueKey", () => {
  it.each([
    ["PQ-825", "PQ-825"],
    [" pq-825 ", "PQ-825"],
    ["https://pagopa.atlassian.net/browse/PQ-825", "PQ-825"],
    ["https://pagopa.atlassian.net/browse/PQ-825?focusedCommentId=1#x", "PQ-825"],
    ["https://pagopa.atlassian.net/jira/software/c/projects/PQ/boards/597?selectedIssue=PQ-825", "PQ-825"],
    ["https://pagopa.atlassian.net/jira/software/c/projects/PQ/boards/597?x=1&selectedIssue=pidm-12&y=2", "PIDM-12"],
  ])("extracts the key from %j", (input, expected) => {
    expect(parseJiraIssueKey(input)).toBe(expected);
  });

  it.each([[""], ["   "], [null], [undefined], ["hello"], ["PQ-"], ["https://example.com/PQ-825x"]])(
    "returns null for %j",
    (input) => {
      expect(parseJiraIssueKey(input)).toBeNull();
    },
  );
});

describe("buildJiraIssueUrl", () => {
  it("builds the browse URL", () => {
    expect(buildJiraIssueUrl("PQ-825")).toBe("https://pagopa.atlassian.net/browse/PQ-825");
  });
});
