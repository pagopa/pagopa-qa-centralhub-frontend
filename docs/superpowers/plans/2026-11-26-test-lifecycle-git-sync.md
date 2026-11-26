# Test Lifecycle Git Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A revision can own a working branch in the central repository; the hub compares, pushes ("Salva tutti") and accepts the feature file, asks what to do when the repository changed, and opens the branch at import, migration and Riapri.

**Architecture:** Two new columns on the revision (`work_branch`, `work_file_sha`) and a service `branch_sync.py` with three operations (status, push, pull) over the existing `TlGitClient`. Publish reuses the working branch without ever resetting it. Submit pushes first and is blocked when the repository changed. The frontend adds a sync bar, a divergence dialog, Salva tutti, per-scenario unsaved badges and a Riapri popup; the import cleanup PR is removed.

**Tech Stack:** FastAPI, SQLAlchemy async, alembic, pytest, ruff (backend at `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-backend`); Next.js 16, React 19, Vitest, pnpm (frontend at `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-frontend`).

**Spec:** `docs/superpowers/specs/2026-11-26-test-lifecycle-git-sync-design.md` (frontend repo).

## Global Constraints

- Alembic migration is `0045`, after `0044_feature_test_type_and_status_tags.py` (check `alembic heads` first).
- New revision columns: `work_branch` `String(255)` and `work_file_sha` `String(64)`, both nullable. A revision without `work_branch` behaves exactly as today.
- Only the central repository is ever written, only the feature file path is ever written on a branch, and no branch is ever reset or force pushed. `reset_branch` is no longer called by the application.
- States: `in_sync`, `hub_ahead`, `repo_ahead`, `diverged`, `branch_missing`, `file_missing`, `unreachable`, `not_configured`, plus `no_branch` (revision without `work_branch`; the plan adds it to the spec's list).
- Default branch name `qa-hub/<code>-r<N>`; a custom name must not contain `..`, spaces, a leading or trailing `/`, `.lock` suffix or `~^:?*[\`, nor equal the base branch.
- Commit message of a push: `git_publish.commit_message(scope, feature, revision)`. History events: `tl.git.pushed`, `tl.git.pulled`.
- Exact texts: block reason on submit `Il repo è cambiato: accetta o sovrascrivi`; HTTP errors `repo_changed` (409, push without `overwrite`), `sync_not_allowed` (409, not a draft or no working branch), `invalid_branch_name` (422), `import_parse_error` (422, pull of a file that does not parse).
- A Git outage never blocks reopen, import, migration, submit or opening the page; it shows as `unreachable`/`branch_missing` and the branch is created at the first push.
- UI copy in Italian; repo content in English; no raw hex in components. Backend: `ruff check` on changed files and pytest green, OpenAPI regenerated with `.venv/bin/python -m scripts.generate_openapi --apim-compatible`. Frontend: `pnpm test`, `pnpm lint`, `npx tsc --noEmit` green; read `node_modules/next/dist/docs/` before Next code. The assistant never commits. Work on a branch cut from updated `main` in both repos.

## Review Focus

- Nothing but the feature file is written on a branch and no branch is reset: approving again after a developer pushed step code keeps that code (test with a fake branch holding an extra file and commit).
- State classification edges: both sides changed to the same content is `in_sync`; file deleted on the branch is `file_missing`; branch deleted is `branch_missing`; a failing Git call makes the page open with `unreachable`, never a 500.
- A hub-born revision makes no Git call before approval; the only early branch paths are import, migration and reopen.
- Push never overwrites a repository that changed without `overwrite=true`; pull of an unparsable file leaves content, lock and `work_file_sha` untouched.
- Submit is blocked with the exact reason in `repo_ahead` and `diverged`, pushes in `hub_ahead`, and is not blocked by a Git outage or a missing token.

---

### Task 1: Columns and pure rules

**Files:**
- Modify: `app/models/test_lifecycle.py` (`TlFeatureRevision`)
- Create: `alembic/versions/0045_revision_work_branch.py`, `app/services/test_lifecycle/branch_sync_rules.py`
- Test: `tests/test_tl_branch_rules.py`

**Interfaces:**
- Produces: `TlFeatureRevision.work_branch`, `work_file_sha` (`Mapped[str | None]`); `blob_sha(text: str) -> str` (git blob sha1 of the UTF-8 bytes); `classify(hub_sha: str, repo_sha: str | None, saved_sha: str | None, same_content: bool) -> str` returning `in_sync | hub_ahead | repo_ahead | diverged | file_missing`; `default_branch_name(code: str, number: int) -> str`; `check_branch_name(name: str, base_branch: str) -> str | None` (Italian error message or `None`).

- [ ] **Step 1: Failing tests**: the two columns persist (reload in a fresh session); `blob_sha("hello\n") == "ce013625030ba8dba906f756967f9e9ca394464a"`; `classify`: `repo_sha=None` → `file_missing`; `same_content=True` → `in_sync` whatever the shas; saved equals both → `in_sync`; repo differs only → `repo_ahead`; hub differs only → `hub_ahead`; both differ and not same content → `diverged`; `saved_sha=None` and not same content → `diverged`; `default_branch_name("FEAT_006_POS", 2) == "qa-hub/FEAT_006_POS-r2"`; `check_branch_name` accepts `qa-hub/x-r1`, `feature/abc`, and rejects `""`, `main` (base), `a..b`, `a b`, `/a`, `a/`, `a.lock`, `a~1`, `a:b`.
- [ ] **Step 2: Run** `.venv/bin/pytest tests/test_tl_branch_rules.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** the model columns, the migration (add and drop the two columns) and the pure module.
- [ ] **Step 4: Run** the file and `.venv/bin/alembic upgrade head`. Expected: PASS, upgrade OK (ask the person to start Postgres if it is down).

### Task 2: Sync status and push

**Files:**
- Create: `app/services/test_lifecycle/branch_sync.py`
- Modify: `app/services/test_lifecycle/git_publish.py` (extract the file-path rule into a public `revision_file_path(scope, feature, revision) -> str`)
- Test: `tests/test_tl_branch_sync.py`

**Interfaces:**
- Consumes: Task 1; `history.build_render`, `render_feature_file`, `TlGitClient` (`get_file`, `put_file`, `branch_exists`, `create_branch`, `head_sha`), fake client in `tests/tl_fakes.py`.
- Produces: `@dataclass BranchSync(branch: str | None, state: str, hub_unsynced: bool, repo_changed: bool, compare_url: str | None)`; `async def get_status(db, feature_id, revision_id, client) -> BranchSync`; `async def push(db, feature_id, revision_id, actor: User, client, *, overwrite: bool = False) -> BranchSync`; `class RepoChangedError(Exception)`, `class SyncNotAllowedError(Exception)`; `async def ensure_branch(client, branch: str, base_branch: str) -> bool` (True when created).

- [ ] **Step 1: Failing tests** (fake Git client, a draft revision with `work_branch` set): status is `no_branch` without a branch, `branch_missing` when the branch does not exist, `file_missing` when the file is absent, `in_sync` after a push, `hub_ahead` after a hub edit, `repo_ahead` after the fake file changed, `diverged` when both changed, `in_sync` when both changed to the same text, `unreachable` when the fake raises `TlGitError`, `not_configured` when `TlGitNotConfigured`; status never writes (fake records no put); `push` creates a missing branch from the base head, commits only the file path with the publish commit message, stores `work_file_sha = blob_sha(render)` and records `tl.git.pushed`; a second identical push makes no commit; push with a repository change and no `overwrite` raises `RepoChangedError` and writes nothing, with `overwrite=True` it writes; push on a non-draft revision or without a branch raises `SyncNotAllowedError`; push never sets `feature.git_path`; an extra file on the branch is untouched.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `branch_sync.py`. Per-revision advisory lock `tl_sync:<revision_id>` (non blocking, `SyncNotAllowedError` when busy); read state under row lock, commit, then network, then re-lock to save, as `git_publish` does. Content equality uses `normalize_text`.
- [ ] **Step 4: Run** the file and `tests/test_tl_git_publish.py`. Expected: PASS.

### Task 3: Pull (accept the repository version)

**Files:**
- Modify: `app/services/test_lifecycle/git_import_file.py` (extract the draft-content replacement of `import_from_git` into `apply_parsed_file(db, feature, rev, parsed, feature_tags, *, allowed) -> int` returning the number of replaced scenarios), `app/services/test_lifecycle/branch_sync.py`
- Test: `tests/test_tl_branch_pull.py`, `tests/test_tl_import_git.py` (must stay green)

**Interfaces:**
- Produces: `async def pull(db, feature_id, revision_id, actor, client) -> TlFeatureDetail`.

- [ ] **Step 1: Failing tests**: a repository file edited on the branch (changed step, added scenario with a custom tag, new `@api` feature tag) is pulled into the draft: scenarios replaced in file order, lock bumped, `work_file_sha` equals the repository blob, test type set, `tl.git.pulled` recorded, status `in_sync`; a file that does not parse raises with the reasons and changes nothing (content, lock, sha); pull on a non-draft revision or without a branch raises `SyncNotAllowedError`; scenario identities of the draft survive for tags that still exist.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the extraction (behaviour of `import_from_git` unchanged) and `pull` reusing the parser, `known_tags` and the same advisory lock.
- [ ] **Step 4: Run** the new file, `tests/test_tl_import_git.py`, `tests/test_tl_branch_sync.py`. Expected: PASS.

### Task 4: API and OpenAPI

**Files:**
- Modify: `app/schemas/test_lifecycle.py` (`TlRevisionOut.work_branch`, new models), `app/api/v1/test_lifecycle.py`, `openapi/qa-hub-be.json`
- Test: `tests/test_tl_branch_api.py`

**Interfaces:**
- Produces: schemas `TlBranchSync(branch, state, hub_unsynced, repo_changed, compare_url)`, `TlBranchPush(actor_email, overwrite: bool = False)`, `TlBranchPull(actor_email)`; routes `GET /features/{feature_id}/revisions/{revision_id}/git-sync -> TlBranchSync`, `POST .../git-sync/push -> TlBranchSync`, `POST .../git-sync/pull -> TlFeatureDetail`; `work_branch: str | None` on the revision output.

- [ ] **Step 1: Failing tests** over HTTP with the fake client: GET returns the state and never 500s when Git fails (`unreachable`) or has no token (`not_configured`); push and pull happy paths; `repo_changed` 409 with code; `sync_not_allowed` 409; pull of an unparsable file 422 `import_parse_error` with reasons; unknown actor 403; unknown feature or revision 404; the revision output exposes `work_branch`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** schemas, routes and error translation (`_translate`), following the style of the publish routes; regenerate OpenAPI.
- [ ] **Step 4: Run** the file and `tests/test_tl_*.py`, plus `ruff check` on the changed files. Expected: green.

### Task 5: Submit pushes first; reopen takes a branch

**Files:**
- Modify: `app/schemas/test_lifecycle.py` (`TlTransitionRequest.branch_name`), `app/services/test_lifecycle/workflow.py`, `app/services/test_lifecycle/rebase.py` (`reopen`), `app/services/test_lifecycle/branch_sync.py`
- Test: `tests/test_tl_branch_workflow.py`, `tests/test_tl_rebase.py` and `tests/test_tl_workflow.py` (adjust only what the new behaviour changes)

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces: `TlTransitionRequest.branch_name: str | None = None`; `rebase.reopen(db, feature, actor, branch_name: str | None = None)` sets `work_branch` (default name or the given one) and `work_file_sha = blob_sha(render of the published revision)`; `branch_sync.push_for_submit(db, feature_id, revision_id, actor, client) -> None`; `class InvalidBranchNameError(Exception)` mapped to 422 `invalid_branch_name`.

- [ ] **Step 1: Failing tests**: reopen without a name sets `work_branch == qa-hub/<code>-r<N>` and the baseline sha, and creates the branch from the base head when Git is up (no file written); with a custom name that already exists the branch is reused untouched and the status is then `repo_ahead` when its file differs; an invalid name is 422 `invalid_branch_name` and nothing is reopened; reopen with Git down still succeeds (status `branch_missing`); submit on a revision with a branch in `hub_ahead` pushes then moves to in review; in `repo_ahead` and `diverged` it is blocked with `Il repo è cambiato: accetta o sovrascrivi` and the revision stays draft; submit with Git down or no token is not blocked; submit on a revision without `work_branch` makes no Git call.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**: validation in `apply_transition` before locking; best-effort branch creation after the reopen commit (no network under row locks); `push_for_submit` called in `apply_transition` for `SUBMIT` before `_apply_transition`, raising `TransitionNotAllowedError([reason])` for `repo_ahead`/`diverged` and swallowing Git outages.
- [ ] **Step 4: Run** `tests/test_tl_*.py`. Expected: PASS.

### Task 6: Publish uses the working branch and never resets

**Files:**
- Modify: `app/services/test_lifecycle/git_publish.py`
- Test: `tests/test_tl_git_publish.py` (update the republish tests to the new behaviour), `tests/test_tl_branch_publish.py`

**Interfaces:**
- Consumes: Tasks 1-2.

- [ ] **Step 1: Failing tests**: publish with a `work_branch` that exists opens the PR from it and writes the approved render only when the file differs; a branch holding a developer's extra file and commit keeps both after approve, after withdraw and approve again, and after a rebase re-approval (fake shows no `reset_branch` call and the extra file present); when the file on the branch changed since `work_file_sha` and differs from the render the file is left as it is, the PR is still opened and the merge import later records it as a `git` revision; a revision without `work_branch` (hub-born) creates `qa-hub/<code>-r<N>` from the base head as today and from then on has `work_branch` and `work_file_sha` set; `pr_branch` equals the working branch; `base_commit_sha` is set when the branch is created and not moved by a republish.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** by removing the `reset_branch` path and applying the rules above; keep the idempotency, advisory lock and failure recording of `publish_revision`.
- [ ] **Step 4: Run** `tests/test_tl_git_publish.py`, `tests/test_tl_git_import.py`, `tests/test_tl_git_sync.py`, `tests/test_tl_rebase.py`. Expected: PASS.

### Task 7: Import and migration open the branch; the cleanup PR goes away

**Files:**
- Modify: `app/services/test_lifecycle/git_import_file.py` (remove `open_cleanup_pr` and `cleanup_branch`; open the branch after the import), `app/services/test_lifecycle/workflow.py` (remove `_import_cleanup_best_effort` and its call), `app/services/test_lifecycle/migration.py`, `app/api/v1/test_lifecycle.py` (remove `/import-cleanup`), `openapi/qa-hub-be.json`
- Test: `tests/test_tl_import_git.py`, `tests/test_tl_import_git_cleanup.py` (delete or rewrite as "no cleanup PR is opened"), `tests/test_tl_migration_execute.py`, `tests/test_tl_branch_import.py`

**Interfaces:**
- Consumes: Tasks 1-2. `import_source.cleanup` is no longer written; old values stay readable in the schema (optional).

- [ ] **Step 1: Failing tests**: after an import from a branch other than main the draft has `work_branch = qa-hub/<code>-r1`, the branch exists from the base head holding the file at its original path with the imported render, `work_file_sha` is its blob sha, the source branch is untouched and no pull request is opened, also after approval; with Git down the import succeeds and the branch is created at the first push; a draft revision created by the migration from Git content gets the same branch, a published migrated feature gets none; `/import-cleanup` is gone (404).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**: best-effort `ensure_branch` plus a push of the file after the import commit (no network under row locks); in the migration only for revisions created as DRAFT from Git content; delete the cleanup code, route and tests that assert it; regenerate OpenAPI.
- [ ] **Step 4: Run** `tests/test_tl_*.py` and `ruff check` on the changed files. Expected: green. The backend is complete here.

### Task 8: Frontend types, hooks and helpers

**Files:**
- Modify: `src/types/test-lifecycle.ts`, `src/hooks/useTestLifecycle.ts`, `src/lib/test-lifecycle.ts`
- Test: `src/lib/test-lifecycle.test.ts`

**Interfaces:**
- Consumes: Task 4 shapes.
- Produces: `TlBranchSyncState`, `TlBranchSync`, `work_branch: string | null` on `TlRevision`; hooks `useTlBranchSync(featureId, revisionId, enabled)`, `usePushTlBranch()` (`{featureId, revisionId, overwrite?}`) and `usePullTlBranch()`; `BRANCH_SYNC_LABEL: Record<TlBranchSyncState, string>`; `needsDecision(state: TlBranchSyncState): boolean` (true for `repo_ahead` and `diverged`); `TlTransition` calls accept `branchName?: string`; the cleanup fields of `TlImportSource` become optional.

- [ ] **Step 1: Failing tests**: `needsDecision` for every state; every state has an Italian label; `BRANCH_SYNC_LABEL` has no missing key.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/test-lifecycle.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** types, helpers and hooks (mutations invalidate the feature, history and `["tl","branch-sync",featureId]` queries; `useTlTransition` sends `branch_name` when given); fix the fixtures that tsc flags with `work_branch: null`.
- [ ] **Step 4: Run** the file, `npx tsc --noEmit`. Expected: green.

### Task 9: Sync bar, divergence dialog, Salva tutti, per-scenario badge

**Files:**
- Create: `src/components/test-lifecycle/BranchSyncBar.tsx`, `src/components/test-lifecycle/BranchDivergenceDialog.tsx`
- Modify: `src/components/test-lifecycle/ScenarioCard.tsx`, `src/app/(portal)/test-lifecycle/[id]/page.tsx`
- Test: `BranchSyncBar.test.tsx`, `BranchDivergenceDialog.test.tsx`, `ScenarioCard.test.tsx`, the detail page test

**Interfaces:**
- Consumes: Task 8; `writer.saveAll()`, `writer.hasUnsaved()`, `writer.afterPendingWrites`, the page `reload()`.
- Produces: `BranchSyncBar({ featureId, revision, editable, writer, onChanged })`; `BranchDivergenceDialog({ open, state, compareUrl, busy, onAccept, onOverwrite, onClose })`.

- [ ] **Step 1: Failing tests**: nothing rendered when the revision has no `work_branch`; `hub_ahead` shows the badge "Non ancora sul repo"; "Salva tutti" saves all dirty drafts first (`saveAll`) and then pushes, and without a branch it only saves; `repo_ahead`/`diverged` on a draft open the dialog on load with the compare link and two buttons (accept calls pull then `onChanged`; overwrite calls push with `overwrite`); a push answered with `repo_changed` opens the dialog; on in-review and approved revisions the state is an information notice with no actions; `unreachable` shows a notice and no dialog; each scenario shows "Modifiche non salvate" next to Salva only while its text differs from the saved one and the badge disappears after saving.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the components and mount the bar at the top of the Scenari tab; the per-scenario badge uses the card's existing saved-versus-draft diff; the status query runs only for a revision with `work_branch` and refetches after pushes and pulls.
- [ ] **Step 4: Run** `pnpm test`, `pnpm lint`, `npx tsc --noEmit`. Expected: green.

### Task 10: Riapri popup

**Files:**
- Create: `src/components/test-lifecycle/ReopenDialog.tsx`
- Modify: `src/components/test-lifecycle/FeatureHeader.tsx`, `src/app/(portal)/test-lifecycle/[id]/page.tsx` (`runTransition(action, note?, branchName?)`)
- Test: `ReopenDialog.test.tsx`, `FeatureHeader.test.tsx`, the detail page test

**Interfaces:**
- Produces: `ReopenDialog({ open, defaultBranch, busy, error, onConfirm, onClose })` with `onConfirm(branchName: string | undefined)`; `FeatureHeader`'s `onTransition: (action, note?, branchName?) => Promise<boolean | void> | void`.

- [ ] **Step 1: Failing tests**: clicking Riapri opens the popup instead of reopening; the popup says a feature branch is opened for the changes, shows the default name `qa-hub/<code>-r<N>` (N = number of the next revision) in an editable field and says an existing branch is reused; confirming with the default sends no `branch_name`, with an edited name it sends it; a 422 `invalid_branch_name` message is shown in the popup and it stays open; cancel does nothing.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the dialog in the style of the withdraw-approval dialog of the header and wire the extra argument through.
- [ ] **Step 4: Run** the full frontend checks. Expected: green.

### Task 11: Git panel, cleanup UI removal and guide

**Files:**
- Modify: `src/components/test-lifecycle/GitPanel.tsx`, `src/hooks/useTestLifecycle.ts` (remove `useRetryTlImportCleanup`), `src/app/(portal)/test-lifecycle/guida/page.tsx`
- Test: `GitPanel.test.tsx`, the guide page test

**Interfaces:**
- Consumes: Task 8.

- [ ] **Step 1: Failing tests**: the Git panel shows the working branch with a link, the sync state label and the PR as today; the cleanup section and its retry button are gone (also for features whose `import_source` still carries old cleanup values); the guide explains the working branch, Salva tutti, the divergence choice and the Riapri popup and no longer mentions the cleanup PR.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the panel changes, remove the hook and its mocks, update the guide text.
- [ ] **Step 4: Run** `pnpm test`, `pnpm lint`, `npx tsc --noEmit`. Expected: green. The person checks the pages in light and dark theme and against a real branch before the PR.
