# Test Lifecycle Jira History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each revision owns its Jira design/implementation/epic keys, reopening requires a new design task, and the Jira tab shows the history across revisions.

**Architecture:** Keys move onto `tl_feature_revisions` (source of truth for history). `tl_features.jira_*` stay as the keys of the current revision so existing consumers keep working; one helper keeps both in step. The detail API gains `jira_history`; the Jira tab renders it.

**Tech Stack:** FastAPI, SQLAlchemy async, alembic, pytest (backend at `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-backend`); Next.js 16, React 19, Vitest, pnpm (frontend at `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-frontend`).

**Spec:** `docs/superpowers/specs/2026-11-26-test-lifecycle-jira-history-design.md` (frontend repo).

## Global Constraints

- Alembic migration is `0043`, after `0042_test_lifecycle_import_source.py`.
- New revision columns: `jira_design_key`, `jira_impl_key`, `jira_qa_epic_key`, `String(32)`, nullable.
- Invariant: `feature.jira_design_key/jira_impl_key/jira_qa_epic_key` equal the current revision's (working, else published).
- Reopen clears design and impl keys, copies the epic.
- Design key must differ from every other revision's design key of the same feature; reason text: "Il task di progettazione è già stato usato da un'altra revisione: serve un nuovo task".
- UI copy in Italian; repo content (code, comments, commits) in English; no raw hex in components.
- Ruff and pytest green (backend); `pnpm test`, `pnpm lint`, `npx tsc --noEmit` green (frontend). The assistant never commits.

## Review Focus

- A feature with no published revision (first draft) keeps working exactly as today.
- A reopened draft with a design key equal to Rev. 1's cannot be submitted, nor can that key be saved.
- Deleting a feature lists Jira issues from all revisions (design and impl of Rev. 1 and Rev. 2).
- The Jira status refresh covers keys of older revisions.
- Backfill is idempotent and leaves features without keys untouched.

---

### Task 1: Model and migration

**Files:**
- Modify: `app/models/test_lifecycle.py` (TlFeatureRevision)
- Create: `alembic/versions/0043_revision_jira_keys.py`
- Test: `tests/test_test_lifecycle_jira_history.py` (new; reused by later tasks)

**Interfaces:**
- Produces: `TlFeatureRevision.jira_design_key|jira_impl_key|jira_qa_epic_key: Mapped[str | None]`.

- [ ] **Step 1: Failing test** `test_revision_has_jira_key_columns`: create a feature with a revision, set the three attributes, flush, reload, assert values.
- [ ] **Step 2: Run** `pytest tests/test_test_lifecycle_jira_history.py -v`. Expected: FAIL (attribute missing).
- [ ] **Step 3:** add the three columns to the model; write migration `0043` adding them and backfilling: `UPDATE tl_feature_revisions r SET jira_design_key=f.jira_design_key, jira_impl_key=f.jira_impl_key, jira_qa_epic_key=f.jira_qa_epic_key FROM tl_features f WHERE r.feature_id=f.id AND (r.number = (SELECT min(number) FROM tl_feature_revisions WHERE feature_id=f.id) OR r.id = f.working_revision_id)`. Downgrade drops the columns.
- [ ] **Step 4: Test the backfill** `test_backfill_assigns_first_and_working_revision` using the migration's SQL on a fixture with revisions 1 (published) and 2 (working): both get the keys; a feature with no keys stays NULL.
- [ ] **Step 5: Run** the file and `alembic upgrade head` on a scratch DB. Expected: PASS, upgrade OK (ask the person to start Postgres if down).

### Task 2: Keep feature and revision in step; reopen; uniqueness

**Files:**
- Modify: `app/services/test_lifecycle/features.py` (`update_feature`), `rebase.py` (`reopen`), `jira_tasks.py` (`create_task`), `workflow.py` (`_submit_reasons` area)
- Test: `tests/test_test_lifecycle_jira_history.py`

**Interfaces:**
- Produces: `sync_current_keys(feature: TlFeature, revision: TlFeatureRevision | None) -> None` in `features.py`: copies the revision's three keys onto the feature. `async def design_key_reused(db, feature_id, revision_id, key) -> bool` in `jira_tasks.py`.

- [ ] **Step 1: Failing tests**: (a) `test_reopen_clears_design_and_impl_keeps_epic`; (b) `test_update_feature_writes_keys_to_working_revision`; (c) `test_create_task_writes_key_to_revision`; (d) `test_submit_blocked_when_design_key_reused` asserting the exact reason text; (e) `test_update_rejects_reused_design_key` (error code `jira_design_key_reused`, HTTP 409 via the existing assignment-error style); (f) `test_first_draft_unchanged`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** `sync_current_keys`, call it in `reopen` after the revision is created (revision keys: design/impl NULL, epic copied), and make `update_feature` and `create_task` set the key on the working revision first, then call `sync_current_keys`. Add `design_key_reused` and use it in the submit reasons and in `update_feature` (only for a changed `jira_design_key`).
- [ ] **Step 4: Run** the file plus the existing `tests/test_test_lifecycle*.py`. Expected: all PASS.
- [ ] **Step 5:** impl auto-creation (`_jira_impl_best_effort`): add `test_impl_task_created_for_reopened_revision` (feature column empty after reopen → task created and stored on the revision); fix if red.

### Task 3: History in the detail API, refresh and delete preview

**Files:**
- Modify: `app/schemas/test_lifecycle.py`, `app/services/test_lifecycle/features.py` (`get_feature_detail`), `jira_tasks.py` (`linked_keys`), `deletion.py` (`_build_preview`), `openapi/qa-hub-be.json`
- Test: `tests/test_test_lifecycle_jira_history.py`

**Interfaces:**
- Produces: `TlJiraHistoryRow(revision_number: int, revision_status: TlRevisionStatus, is_current: bool, design: TlJiraLink | None, impl: TlJiraLink | None, qa_epic: TlJiraLink | None)`; `TlFeatureDetail.jira_history: list[TlJiraHistoryRow] = []` (newest first). Uses the existing `TlJiraLink` with `role`.
- Epic of a row: the revision override, else the scope epic.

- [ ] **Step 1: Failing tests**: `test_detail_jira_history_lists_revisions_newest_first`; `test_linked_keys_include_all_revisions`; `test_delete_preview_includes_older_revision_issues`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the schema, build rows from revisions plus `jira_cache` (reuse the link-building code of `jira_links`, extract a small private function rather than duplicating), widen `linked_keys` and the delete preview to all revisions' keys.
- [ ] **Step 4: Regenerate OpenAPI** with the repo's script and run the full backend suite and `ruff check`. Expected: green.

### Task 4: Frontend types and Jira history tab

**Files:**
- Modify: `src/types/test-lifecycle.ts`, `src/components/test-lifecycle/JiraLinks.tsx` (or a new `JiraHistory.tsx` next to it), `src/app/(portal)/test-lifecycle/[id]/page.tsx`
- Test: `src/components/test-lifecycle/JiraHistory.test.tsx`

**Interfaces:**
- Consumes: `jira_history` rows from Task 3 (`revision_number`, `revision_status`, `is_current`, `design`, `impl`, `qa_epic`, each `TlJiraLink | null`).
- Produces: `JiraHistory({ rows }: { rows: TlJiraHistoryRow[] })`.

- [ ] **Step 1: Failing tests**: renders one row per revision with "Rev. N"; shows key, summary and status text for each present task; shows "—" for missing; marks the `is_current` row with "In lavorazione" (text, not colour only); keys link to Jira in a new tab; empty list renders the existing empty state.
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/JiraHistory.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the types and `JiraHistory` (table with hub tokens, reuse the status chip of `JiraLinks`); replace the flat list in the Jira tab with it.
- [ ] **Step 4: Run** `pnpm test`, `pnpm lint`, `npx tsc --noEmit`. Expected: green.

### Task 3b: Backend accepts Jira URLs

**Files:**
- Modify: `app/schemas/test_lifecycle.py` (validators for `jira_design_key`, `jira_impl_key`, `jira_qa_epic_key`, `product_issue_key`; patterns at lines 117-118)
- Test: `tests/test_test_lifecycle_jira_history.py`

**Interfaces:**
- Produces: `normalize_jira_key(value: str | None) -> str | None` in `app/schemas/test_lifecycle.py`: strips, accepts a bare key or a URL containing `/browse/<KEY>` or `selectedIssue=<KEY>`, returns the upper-case key; returns the input unchanged when nothing matches so the existing pattern check still raises the current message.

- [ ] **Step 1: Failing tests**: `https://pagopa.atlassian.net/browse/pq-123?x=1` → `PQ-123` for design; same URL shape with `ABC-9` for impl/epic/product; a design URL with a non-PQ key still fails with the existing message; garbage still fails.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `normalize_jira_key` and call it at the start of each of the four validators.
- [ ] **Step 4: Run** the backend suite. Expected: PASS.

### Task 4b: Frontend URL input and create button next to the field

**Files:**
- Modify: `FeatureMetaPanel.tsx` (the four key inputs and the design-task button), reuse `parseJiraIssueKey` from `src/utils/jiraIssue.ts`
- Test: `FeatureMetaPanel.test.tsx`

**Interfaces:**
- Consumes: `parseJiraIssueKey`, `useCreateTlJiraTask`, same visibility rule as `JiraLinks` (`canCreateDesign`).

- [ ] **Step 1: Failing tests**: pasting `https://pagopa.atlassian.net/browse/PQ-578` into Jira progettazione and blurring saves `PQ-578`; same for implementazione, Epic QA and Epic/Story prodotto; unparseable text keeps today's validation message; a "Crea task" button appears next to Jira progettazione only on an empty draft and calls the create mutation with kind `design`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**: normalise through `parseJiraIssueKey` before saving (leave the text untouched if it returns null); render the button beside the field.
- [ ] **Step 4: Run** `pnpm test`, `pnpm lint`, `npx tsc --noEmit`. Expected: green.

### Task 5: Reopen hint and guide

**Files:**
- Modify: `FeatureMetaPanel.tsx` (+ its test), guide page text (`src/app/(portal)/test-lifecycle/guide`)

- [ ] **Step 1: Failing test** `shows a hint when a reopened draft has no design task`: working revision number > 1, status draft, empty design key → text "Questa revisione richiede un nuovo task di progettazione"; not shown on a first draft or when the key is set.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the hint; add one sentence to the guide's Reopen section about the new task and the Jira history.
- [ ] **Step 4: Run** the full frontend checks. Expected: green. The person checks the page visually in both themes before the PR.
