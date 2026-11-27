# Test Lifecycle Scope Rename and Feature Move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename scopes (code included, with features) and move features between scopes, adapting code, number and scenario tags to the target scope when the features are not yet on `main` with hub identifiers, and keep the open migration alignment pull requests in step.

**Architecture:** A service `rekey.py` computes who can be adapted and adapts a feature (code, number, scenario tags, aliases, migration item); `move_features` and `update_scope` use it in one transaction. `migration_align` gets a refresh that updates the destination pull request and retires the source ones, with a new `close_pull` on the Git clients. The frontend adds the move dialog, selection in the table, a detail action and the editable scope code.

**Tech Stack:** FastAPI, SQLAlchemy async, pytest, ruff (backend at `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-backend`); Next.js 16, React 19, Vitest, pnpm (frontend at `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-frontend`).

**Spec:** `docs/superpowers/specs/2026-11-27-test-lifecycle-scope-rename-move-design.md` (frontend repo).

## Global Constraints

- No new column and no alembic migration: identifiers stay derived from scope code and number.
- Adapting a feature means, together or not at all: `scope_id`, `number` (from the target scope's counter when the scope changes, unchanged on a code rename), `code = feature_code(scope.code, number)`, every scenario `tag = scenario_tag(scope.code, number, scenario.number)`, the previous scenario tag added to `tl_scenario_aliases` (`alias` is globally unique: skip when it already exists), the migration item's `scope_code` and `number` aligned, and a default `work_branch` (`qa-hub/<old code>-r<N>`) renamed to the new default.
- A feature is **blocked** from adapting when: one of its revisions has `pr_state == "open"`; its published revision exists and `alignment_pending` is false (the file is on `main` with hub identifiers); or a draft revision already pushed its working branch (`work_hub_sha` not null). Reasons are Italian sentences. A move without adapting has no restriction.
- A request is all-or-nothing: any blocked or unknown feature, unknown target scope, or a running migration (`try_advisory_lock` on `migration.LOCK_KEY`) refuses everything and changes nothing (counters included).
- Errors (exact codes): `adapt_blocked` 409 with `blocked: [{feature_id, code, reasons}]`; `scope_code_blocked` 409 with the same list; `migration_in_progress` 409; unknown ids 404. `ScopeCodeLockedError` and `scope_code_locked` are removed.
- History events: `tl.feature.moved` (old and new scope code, old and new feature code) per feature.
- Git: only the central repository is written; a Git failure after the database change never undoes it, it is returned as `alignment_error` and stored in the scope's `pr_error`; no token means no refresh and `alignment_error` says so.
- UI copy in Italian; repo content in English; no raw hex in components. Backend: `ruff check` on changed files, pytest green, OpenAPI regenerated with `.venv/bin/python -m scripts.generate_openapi --apim-compatible`. Frontend: `pnpm test`, `pnpm lint`, `npx tsc --noEmit` green; read `node_modules/next/dist/docs/` before Next code. The assistant never commits. Work on a branch cut from updated `main` in both repos.

## Review Focus

- All-or-nothing: with one blocked or unknown feature in a bulk request nothing changes (features, scenario tags, aliases, `next_feature_number`).
- No collision: after moves and renames no two features share a code and no two scenarios of different features share a tag; old tags are aliases and the NRT still resolves a run recorded under an old tag.
- A feature already on `main` with hub identifiers, with an open pull request, or with a pushed working branch is blocked from adapting, and the same feature can still be moved without adapting.
- Alignment pull requests: the destination one is created or updated with the new codes and tags; a source one gets the moved files restored to their `main` content and is closed when nothing is left to carry; a Git failure leaves the database change in place and reports the error.
- Renaming a scope code adapts all its features or refuses with the list; renaming only the name touches no feature.

---

### Task 1: Adaptation core

**Files:**
- Create: `app/services/test_lifecycle/rekey.py`
- Test: `tests/test_tl_rekey.py`

**Interfaces:**
- Produces: `async def adapt_blockers(db, feature: TlFeature) -> list[str]`; `class AdaptBlockedError(Exception)` with `.blocked: list[dict]` (`feature_id: uuid.UUID`, `code: str`, `reasons: list[str]`); `async def adapt_feature(db, feature: TlFeature, scope: TlScope, number: int) -> tuple[str, str]` returning `(old_code, new_code)` and applying the full adaptation of the Global Constraints (caller holds the locks and commits).

- [ ] **Step 1: Failing tests** (features built through the API and the migration fixtures): a draft feature with scenarios is adapted to another scope: code, number, scope, every scenario tag change, the old tag is an alias, `work_branch` default is renamed; a feature already aliased does not duplicate or fail; blockers: a feature with an open PR, a published feature with `alignment_pending` false, a draft whose branch was pushed are blocked with a reason each, while a published `alignment_pending` migrated feature and a never published feature are adaptable; `adapt_feature` also aligns the migration item's `scope_code` and `number`.
- [ ] **Step 2: Run** `.venv/bin/pytest tests/test_tl_rekey.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `rekey.py` with the signatures above, reusing `gherkin.feature_code` and `gherkin.scenario_tag`.
- [ ] **Step 4: Run** the file. Expected: PASS.

### Task 2: Move endpoint

**Files:**
- Modify: `app/schemas/test_lifecycle.py`, `app/api/v1/test_lifecycle.py`, `app/services/test_lifecycle/rekey.py` (add `move_features`), `openapi/qa-hub-be.json`
- Test: `tests/test_tl_move.py`

**Interfaces:**
- Consumes: Task 1.
- Produces: schemas `TlMoveRequest(feature_ids: list[uuid.UUID], target_scope_id: uuid.UUID, adapt: bool = True, actor_email: str)` (1 to 200 ids), `TlMoveItem(feature_id, old_code, new_code, old_scope_code, new_scope_code)`, `TlMoveResult(moved: list[TlMoveItem], skipped: list[uuid.UUID], alignment_error: str | None = None)`, `TlBlockedFeature(feature_id, code, reasons)`; `POST /api/v1/test-lifecycle/features/move -> TlMoveResult`; `async def move_features(db, feature_ids, target_scope_id, adapt, actor) -> list[TlMoveItem]` (no Git here; Task 5 wires the refresh).

- [ ] **Step 1: Failing tests**: moving without `adapt` changes only `scope_id` and `number` (code, tags, `git_path` untouched, counter advanced); with `adapt` the full adaptation happens and the old tags resolve through the aliases; a feature already in the target is skipped; one blocked feature in a bulk request makes the response `409 adapt_blocked` with that feature and nothing else changed (compare before and after, counter included); unknown feature or scope is 404; a running migration (hold the lock in the test) is `409 migration_in_progress`; unknown actor 403; one `tl.feature.moved` event per feature; numbers of the moved features are distinct and consecutive from the target counter.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `move_features` (lock target scope, then the features ordered by id, `with_for_update`) and the route with `_translate` mappings for the new errors.
- [ ] **Step 4: Regenerate OpenAPI**; run the file, `tests/test_tl_features.py`, `ruff check`. Expected: green.

### Task 3: Rename a scope's code with features

**Files:**
- Modify: `app/services/test_lifecycle/scopes.py` (`update_scope`), `app/api/v1/test_lifecycle.py`
- Test: `tests/test_tl_scopes.py` (replace the "code locked once features exist" test), `tests/test_tl_scope_rename.py`

**Interfaces:**
- Consumes: Task 1.
- Produces: `update_scope` adapts every feature of the scope when the code changes (numbers unchanged); new `ScopeCodeBlockedError(blocked: list[dict])` mapped to `409 scope_code_blocked`; `ScopeCodeLockedError` removed.

- [ ] **Step 1: Failing tests**: renaming the code of a scope with adaptable features changes the codes and tags of all of them and records the events; one blocked feature makes it `409 scope_code_blocked` with the list and nothing changes (scope code too); renaming only the name or other fields touches no feature; a code already used by another scope (case insensitive) is still `scope_code_conflict`; a scope without features renames as before.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** inside the existing scope row lock (features locked in id order); remove the locked error and its API mapping.
- [ ] **Step 4: Run** `tests/test_tl_scopes.py`, the new file and `tests/test_tl_*.py`. Expected: green.

### Task 4: Scope name in feature responses

**Files:**
- Modify: `app/schemas/test_lifecycle.py` (`TlFeatureListItem`, `TlFeatureDetail`), `app/services/test_lifecycle/features.py`, `openapi/qa-hub-be.json`
- Test: `tests/test_tl_features.py`

**Interfaces:**
- Produces: `scope_name: str | None = None` on `TlFeatureListItem` and `TlFeatureDetail`.

- [ ] **Step 1: Failing test**: list and detail return the scope's name next to its code.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** and regenerate OpenAPI.
- [ ] **Step 4: Run** `tests/test_tl_features.py`. Expected: PASS.

### Task 5: Close a pull request and refresh the alignment pull requests

**Files:**
- Modify: `app/services/test_lifecycle/git_client.py`, `app/services/test_lifecycle/local_git.py`, `tests/tl_fakes.py`, `app/services/test_lifecycle/migration_align.py`, `app/services/test_lifecycle/rekey.py`, `app/api/v1/test_lifecycle.py`
- Test: `tests/test_tl_git_client.py` (close), `tests/test_tl_migration_refresh.py`

**Interfaces:**
- Produces: `TlGitClient.close_pull(number: int) -> None` (and the same on the local client and the fake); `async def migration_align.refresh_after_change(db, git, moves: list[tuple[str, str]]) -> str | None` where each tuple is `(old scope code, new scope code)`, returning an error message or `None`; the move and rename routes call it best effort and put the message in `alignment_error`.

- [ ] **Step 1: Failing tests**: `close_pull` closes the pull request on the HTTP client (mock transport), the local client and the fake; after a move with `adapt` of pending migrated features, the destination scope's branch holds their files with the new codes and tags and its pull request is open and updated; the source scope's branch has the moved files restored to the `main` content, and when no pending feature is left in the source scope its pull request is closed and the scope's state recorded (`pr_state == "closed"`); when features remain, the source pull request is refreshed with them; a failing Git call returns the error message, leaves the database change and stores `pr_error`; without a token nothing is called and the message says so; a scope rename refreshes the same way (old code is the source, new code the destination).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the client methods, `refresh_after_change` (destination `open_alignment_pr`; per source: restore the moved paths from the `main` head with `put_file`, then close or refresh), and wire the routes.
- [ ] **Step 4: Run** the new files, `tests/test_tl_migration_execute.py`, `tests/test_tl_migration_sync.py`, `ruff check`, the whole `tests/test_tl_*.py`. Expected: green. The backend is complete here.

### Task 6: Frontend types, hooks and helpers

**Files:**
- Modify: `src/types/test-lifecycle.ts`, `src/hooks/useTestLifecycle.ts`, `src/lib/test-lifecycle.ts`
- Test: `src/lib/test-lifecycle.test.ts`

**Interfaces:**
- Consumes: Tasks 2-4 shapes.
- Produces: types `TlBlockedFeature`, `TlMoveRequest`, `TlMoveItem`, `TlMoveResult`, `scope_name` on `TlFeatureListItem` and `TlFeatureDetail`; hook `useMoveTlFeatures()` (`mutateAsync({featureIds, targetScopeId, adapt})`, invalidates features, scopes and the feature detail); `apiErrorBlocked(err: unknown): TlBlockedFeature[]` (the `blocked` list of an `adapt_blocked` or `scope_code_blocked` error, empty otherwise).

- [ ] **Step 1: Failing tests**: `apiErrorBlocked` returns the list for the two codes and `[]` for any other error or malformed detail.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/test-lifecycle.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**; fix fixtures that tsc flags.
- [ ] **Step 4: Run** the file and `npx tsc --noEmit`. Expected: green.

### Task 7: Scope titles and the editable code

**Files:**
- Modify: `src/components/test-lifecycle/ScopeOverview.tsx`, `src/components/test-lifecycle/ScopeManagerDialog.tsx`, the scope picker labels in `CreateFeatureDialog.tsx` and `FeatureTable.tsx` filters
- Test: `ScopeOverview.test.tsx`, `ScopeManagerDialog.test.tsx`, `CreateFeatureDialog.test.tsx`

**Interfaces:**
- Consumes: Task 6 (`apiErrorBlocked`).

- [ ] **Step 1: Failing tests**: the scope card shows the name as its title with the code as a label next to it; the dialog's code field is editable even when the scope has features and shows the note "Il codice cambia solo le feature che si possono adeguare; le altre bloccano la modifica"; a `scope_code_blocked` answer lists the blocking features (code and reasons) and keeps the dialog open; pickers show the name first and the code in brackets.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full frontend checks. Expected: green.

### Task 8: Move dialog, table selection and detail action

**Files:**
- Create: `src/components/test-lifecycle/MoveFeaturesDialog.tsx`
- Modify: `src/components/test-lifecycle/FeatureTable.tsx`, `src/components/test-lifecycle/FeatureHeader.tsx`, `src/app/(portal)/test-lifecycle/[id]/page.tsx`, `src/app/(portal)/test-lifecycle/guida/page.tsx`
- Test: `MoveFeaturesDialog.test.tsx`, `FeatureTable.test.tsx`, `FeatureHeader.test.tsx`, the detail page test, the guide test

**Interfaces:**
- Produces: `MoveFeaturesDialog({ open, features: { id: string; code: string }[], currentScopeIds: string[], onClose, onMoved })`.

- [ ] **Step 1: Failing tests**: each table row has a checkbox, a select-all, and a "Sposta in…" button enabled with a selection and gated by the edit permission; the dialog asks for the target scope (the current one is excluded) and has "Adegua codice e tag" on by default, explaining what changes (code, number, tags, the Epic QA of future Jira tasks) and what does not (file path, existing Jira tasks); confirming calls the move with the selected ids, `adapt` and the target; a `409 adapt_blocked` lists the blocking features and offers to move without adapting; a success shows the result and the `alignment_error` if any; the detail header offers the same action for one feature; the guide explains rename and move and the adaptation limit.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the dialog (the selection lives in the table; the header opens the dialog for the current feature) and the guide text.
- [ ] **Step 4: Run** `pnpm test`, `pnpm lint`, `npx tsc --noEmit`. Expected: green. The person checks the pages in light and dark theme and runs the WISP reorganisation against the real scopes before the PR.
