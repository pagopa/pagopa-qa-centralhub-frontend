# Jira issue links in the NRT list Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the NRT ticket fields accept a Jira URL as well as a bare key, and add direct links to the issue from the details panel and from the list.

**Architecture:** A pure util (`parseJiraIssueKey`, `buildJiraIssueUrl`) is the single place that knows Jira URL shapes. `NrtDetailsPanel` parses on blur and runs the existing lookup with the key (the existing success path already stores the key). `JiraIssueField` and the `NrtsTable` status chips render links built from the stored key. Only the key is persisted; no backend change.

**Tech Stack:** Next.js, React, TypeScript, Vitest + Testing Library, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-11-21-jira-issue-links-design.md`

## Global Constraints

- Jira browse base: `https://pagopa.atlassian.net/browse` (already hardcoded in `src/app/(portal)/jira/page.tsx`).
- Persist only the issue key (`product_issue`, `qa_issue`); no backend/DB/API change.
- Accepted inputs: bare key, `.../browse/KEY`, `...?selectedIssue=KEY`; key returned upper-case.
- External links: `target="_blank"` and `rel="noopener noreferrer"`.
- UI copy in Italian, code/comments in English.

## Review Focus

- Pasted URL with trailing query/hash (`/browse/PQ-825?focusedCommentId=1#x`): key still extracted.
- Input with surrounding whitespace or lowercase key (` pq-825 `): normalised to `PQ-825`.
- Text that is not a key or Jira URL (`hello`, `https://example.com/PQ-825x`): shows "Nessuna issue Jira trovata" without calling the lookup.
- Clicking the list status link must open Jira without expanding/collapsing the row.
- Empty ticket: no link rendered anywhere.

---

### Task 1: Jira issue key util

**Files:**
- Create: `src/utils/jiraIssue.ts`
- Test: `src/utils/jiraIssue.test.ts`

**Interfaces:**
- Produces: `parseJiraIssueKey(input: string | null | undefined): string | null`; `buildJiraIssueUrl(key: string): string`; `JIRA_BROWSE_BASE_URL: string`.

- [ ] **Step 1: Write failing tests** in `src/utils/jiraIssue.test.ts` (`it.each`):
  - `parseJiraIssueKey("PQ-825")` → `"PQ-825"`; `" pq-825 "` → `"PQ-825"`
  - `"https://pagopa.atlassian.net/browse/PQ-825"` → `"PQ-825"`; with `?focusedCommentId=1#x` suffix → `"PQ-825"`
  - `"https://pagopa.atlassian.net/jira/software/c/projects/PQ/boards/597?selectedIssue=PQ-825"` → `"PQ-825"`
  - `""`, `null`, `undefined`, `"hello"`, `"PQ-"`, `"https://example.com/PQ-825x"` → `null`
  - `buildJiraIssueUrl("PQ-825")` → `"https://pagopa.atlassian.net/browse/PQ-825"`
- [ ] **Step 2: Run** `npx vitest run src/utils/jiraIssue.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the three exports in `src/utils/jiraIssue.ts`. Key pattern `[A-Z][A-Z0-9]+-\d+` (case-insensitive) anchored so the whole trimmed input is a key, or matched after `/browse/` or `selectedIssue=` followed by end/`?`/`#`/`&`.
- [ ] **Step 4: Run** the same command — Expected: PASS.

### Task 2: Details panel accepts URLs and shows an open link

**Files:**
- Modify: `src/components/nrts/NrtDetailsPanel.tsx` (`checkJiraIssue`, ~line 162)
- Modify: `src/components/nrts/JiraIssueField.tsx`
- Test: `src/components/nrts/NrtDetailsPanel.test.tsx`, `src/components/nrts/JiraIssueField.test.tsx`

**Interfaces:**
- Consumes: `parseJiraIssueKey`, `buildJiraIssueUrl` from Task 1.
- Produces: `JiraIssueField` unchanged props; renders an `<a aria-label="Apri ticket Jira">` when `parseJiraIssueKey(value)` is non-null.

- [ ] **Step 1: Write failing tests**
  - `JiraIssueField.test.tsx`: with `value="PQ-825"` a link named "Apri ticket Jira" has `href` `https://pagopa.atlassian.net/browse/PQ-825`, `target="_blank"`, `rel` containing `noopener`; with `value=""` and `value="hello"` no such link.
  - `NrtDetailsPanel.test.tsx`: blur on the QA field after changing the input to `https://pagopa.atlassian.net/browse/pq-456?x=1` → `fetchJiraIssue` called once with `("PQ-456", details.test_run, true)`; blur with value `hello` → "Nessuna issue Jira trovata" shown and `fetchJiraIssue` not called. Existing blur test (` QA-456 ` → `"QA-456"`) must keep passing.
- [ ] **Step 2: Run** `npx vitest run src/components/nrts/JiraIssueField.test.tsx src/components/nrts/NrtDetailsPanel.test.tsx` — Expected: new tests FAIL.
- [ ] **Step 3: Implement.** In `checkJiraIssue`: `const key = parseJiraIssueKey(issueId)`; if empty input return as today; if `key` is null set the field's not-found flag and return; else call `fetchJiraIssue(key, ...)` (on success `handleJiraIssueBlur` in `NrtsTable.tsx` already stores the key, normalising the field). In `JiraIssueField`: icon link (lucide `ExternalLink`) next to the input, same styling family as other icon buttons.
- [ ] **Step 4: Run** the same command — Expected: PASS.

### Task 3: Status chips in the list link to Jira

**Files:**
- Modify: `src/components/nrts/NrtsTable.tsx` (`productIssueStatus` / `qaIssueStatus` cells, ~lines 353-358)
- Test: `src/components/nrts/NrtsTable.test.tsx`

**Interfaces:**
- Consumes: `parseJiraIssueKey`, `buildJiraIssueUrl`.

- [ ] **Step 1: Write failing tests** (follow existing fixtures in `NrtsTable.test.tsx`): a run with `product_issue: "PIDM-1"`, `qa_issue: "PQ-825"` renders links to `.../browse/PIDM-1` and `.../browse/PQ-825` (new tab); a run with null issues renders no such links; clicking the link does not toggle the row's details panel.
- [ ] **Step 2: Run** `npx vitest run src/components/nrts/NrtsTable.test.tsx` — Expected: new tests FAIL.
- [ ] **Step 3: Implement.** Wrap each `Chip` in `<a>` when the stored issue parses to a key; `onClick`/`onKeyDown` call `stopPropagation` (same pattern as the actions cell). Chip itself unchanged.
- [ ] **Step 4: Run** the same command, then the full gate: `npm run lint && npm test` — Expected: all pass.
- [ ] **Step 5:** Report lint/test results and ask for confirmation before any commit (per user's Git rules; no commit without explicit approval).
