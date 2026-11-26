# Test Lifecycle: Jira tasks per revision and Jira history

Date: 2026-11-26
Repos: `pagopa-qa-centralhub-backend` (model, migration, services, API) and `pagopa-qa-centralhub-frontend` (Jira tab, small hints).
Size: a project (five packages, backend first, one branch per repo).

## Intent and why

A feature that is Implemented or Running sometimes needs a change. The path already exists: "Riapri" creates a new
draft revision (Rev. 2, 3, ...). What is missing is the Jira side: today a feature has a single design key, a single
implementation key and a single epic, so a change either reuses the old task or overwrites it and the earlier task is
lost from the page. The QA team wants every change tied to its own Jira task, and a Jira tab that tells the whole
story of the feature, from the first design to the latest change.

## Goals

1. Each revision owns its Jira design task and its Jira implementation task (and, if it differs from the default,
   its epic).
2. Reopening a feature gives the new revision empty design and implementation keys: a change needs a new task.
   The epic is carried over and can be changed.
3. A new revision cannot be sent to review without a design task, and that task must not be one already used by
   another revision of the same feature (decision of the person: the task is mandatory).
4. The Jira tab shows a history: one row per revision (Rev. 1, Rev. 2, ...) with design, implementation and epic as
   used in that revision, with live status from Jira. Only the revision being worked on is editable.
5. Existing features lose nothing: their current keys become the history of their first revision.

## Non-goals

Creating Jira tasks automatically on reopen (the person can already create or link one from the page); changing the
Jira client or the status refresh cadence; a Jira task shared by several features; editing keys of past revisions;
the product Epic/Story (already per revision).

## Anti-goals

Losing a Jira key that is linked today; a reopened draft that silently keeps the old design task and can be sent to
review; the delete dialog missing Jira issues of older revisions; a history that shows a key without saying which
revision used it; colour as the only carrier of a status (status text stays).

## Constraints

Backend: alembic migration next after `0042`, tests with pytest, `ruff`, OpenAPI file `openapi/qa-hub-be.json`
regenerated. Frontend: hub tokens, Italian copy, Vitest, `pnpm lint`, `npx tsc --noEmit`; read `node_modules/next/dist/docs/`
before Next code. No commits or PRs by the assistant; the person commits.

## Approaches considered

A. Move the keys fully onto the revision and drop the feature columns. Cleanest model, but about twenty call sites
   (submit guard, git publish title, delete preview, Jira task creation and refresh, migration code) change at once.
B. Keys live on the revision (source of truth for history); the feature columns stay as "the keys of the current
   revision" (working revision, else published). Existing code keeps reading the feature columns; one helper keeps
   the two in step. Chosen.
C. A separate history table filled by events. Extra moving part, and the revision already is the unit of change.

## Decisions

Confirmed by the person: the lifecycle (Reopen, then new design task and optionally a new epic), the Jira tab as a
history of tasks and epics, and the design task mandatory for every new revision.

My calls (to confirm when reading):
- New columns on `tl_feature_revisions`: `jira_design_key`, `jira_impl_key`, `jira_qa_epic_key` (all nullable,
  `String(32)`). `jira_qa_epic_key` is the per-revision override; the effective epic stays "override, else scope epic".
- Invariant: `feature.jira_*` always equals the keys of the current revision. One helper in the services layer
  writes both whenever a key changes (feature update, task creation, impl auto-creation after approval).
- Reopen: the new revision gets `jira_design_key = jira_impl_key = NULL` and the epic copied; the feature columns for
  design and implementation are cleared with it. The Jira cache keeps every key ever seen.
- Uniqueness: on update and at submit, the design key must not equal the design key of any other revision of the same
  feature. Reason shown: "Il task di progettazione è già stato usato da un'altra revisione: serve un nuovo task".
  The implementation key is not checked (it is created automatically after approval and a human rarely types it).
- Implementation task: after approval the existing best-effort step creates it when the feature column is empty,
  which after the change means once per revision, with no new code path.
- Backfill: the first revision of each feature gets the feature's three keys. If a feature already has a working
  revision numbered above 1 (reopened under the old model), that working revision also gets a copy, and must pick a
  different design task before it can be sent to review.
- History API: `jira_history` on the feature detail, newest revision first, each row with revision number, status and
  the design, implementation and epic as `TlJiraLink`. The existing flat `jira` list stays for the current revision.
- Refresh and the delete dialog read the keys of all revisions, not only the current ones.
- Frontend: the Jira tab becomes a table (Revisione, Progettazione, Implementazione, Epic QA) with a "In lavorazione"
  marker on the editable row; the Metadati panel shows a one-line hint on a reopened draft with no design key.

Added after the person's review (confirmed):
- Reopen creates no Jira task by itself. The design task is created on request with a "Crea task" button placed next
  to the "Jira progettazione" field in Metadati (today it exists only in the Jira tab); the created task is placed
  under the effective epic (existing behaviour of `create_task`). Alternatively the person types a task they opened
  by hand. The button shows only on a draft revision with an empty design key.
- My call: the implementation task keeps its current behaviour (best-effort creation right after approval when the
  field is empty, with a manual button if it failed). The person can ask for on-demand there too.
- Jira key fields accept a full Jira URL as well as the bare key (as the NRT section already does with
  `parseJiraIssueKey` in `src/utils/jiraIssue.ts`): Jira progettazione, Jira implementazione, Epic QA, Epic/Story
  prodotto. The frontend normalises on paste/blur; the backend validators also accept a URL and store the bare
  upper-case key, so API clients behave the same. Invalid input keeps the current error messages.

## Left to the builder

Column order and exact table markup, the helper's name and place, how the history rows are built in one query, wording
of the hint, and the test fixtures.
