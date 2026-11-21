# Jira issue links in the NRT list — design

## Intent
In the NRT list, the REVISIONE panel lets QA enter the product and QA Jira tickets.
Today only the bare key (e.g. `PQ-825`) is accepted, and there is no way to open the
issue from the hub. Typical workflow: open the issue in Jira, copy its URL, paste it
into the hub. That paste currently fails ("Nessuna issue Jira trovata").

## Goals
- The ticket fields accept either a bare key or a Jira URL; the key is extracted.
- A direct "open in Jira" link is available for each ticket.

## Non-goals / anti-goals
- No backend, DB or API change. Only the issue key is persisted (`product_issue`, `qa_issue`).
- No storing of full URLs (would complicate data without benefit).

## Approaches considered
1. **Frontend-only: parse URL to key, build link from the known base (chosen).**
   Base `https://pagopa.atlassian.net/browse` is already hardcoded in the frontend.
2. Store the full URL in the existing columns: breaks status lookup and existing data.
3. Add URL columns + migration: unnecessary, the URL is derivable from the key.

## Design
- New util `parseJiraIssueKey(input): string | null` extracting the key from
  `.../browse/KEY`, `...?selectedIssue=KEY`, or a bare `KEY` (case-insensitive, returned
  upper-case); `null` if nothing matches. Plus `buildJiraIssueUrl(key)`.
- `NrtDetailsPanel.checkJiraIssue`: on blur, parse the value; if a key is found,
  normalise the field to the key (via `handleIssueInputChange`-style update) and run the
  existing lookup with the key; if not, treat as not found as today.
- `JiraIssueField`: "open in Jira" icon link (new tab, `rel="noopener noreferrer"`)
  next to the input, shown when the value parses to a key.
- `NrtsTable`: issue-status chips (`productIssueStatus`, `qaIssueStatus`) wrapped in a
  link to the issue when the ticket is set; click must not toggle row expansion.

## Left to the builder
Exact icon/styling (follow existing components), test layout (unit tests for the util,
component tests extending `JiraIssueField.test.tsx` / `NrtDetailsPanel.test.tsx`).
Run lint and tests before proposing a commit.
