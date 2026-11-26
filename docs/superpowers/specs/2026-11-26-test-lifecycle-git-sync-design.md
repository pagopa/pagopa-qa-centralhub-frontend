# Test Lifecycle: synchronisation of feature files with the Git repository

Date: 2026-11-26
Repos: `pagopa-qa-centralhub-backend` (model, git services, API) and `pagopa-qa-centralhub-frontend`
(detail page, reopen dialog).
Size: a project in four deliverable steps (backend first in each, one branch per repo). It is project 2 of two;
project 1 (tag catalog) is merged.

## Intent and why

The hub assumed that a feature file is edited only through the hub. In practice developers edit the file on the
branch of the repository with external editors and commit new versions. The hub must therefore keep the
file and its scenarios coherent with the branch (preview and scenarios equal to the repository, and the
repository equal to what the hub shows), warn when the two have diverged and let the person choose, and
push the work of a draft to the repository periodically without turning every keystroke into a commit.

## Goals

1. A revision can have a **working branch** in the central repository. While it exists, the hub can compare the
   feature file on that branch with the hub content, push the hub content, and accept the branch content.
2. Opening a feature (the detail page) checks the branch: if the file changed on the repository, the person is told
   and asked to **accept the repository version** or **overwrite the repository with the hub version**.
3. One action, **Salva tutti**, saves every scenario with unsaved changes to the hub and pushes the feature file to the
   branch in a single commit. A visible badge says when the hub content is not yet on the repository, and each
   scenario shows when it has changes not yet saved.
4. The working branch exists from the start in these cases: import from the central repository, migration of
   features that have a file, and **Riapri** (a popup tells the person that a feature branch is opened for the
   changes and lets them choose its name; an existing branch with that name is used).
5. A feature born in the hub stays only in the hub database until it is approved; at approval the branch and the PR are
   created as today. The PR is opened at approval in every case (decision of the person).
6. The hub never rewrites history of a branch and touches only the feature file: the branch also holds the step
   code written by developers.

## Non-goals

Writing to any repository other than `pagopa-platform-integration-test` (an import from an external repository is
out of scope and, when it arrives, is read-only); merging or resolving content conflicts line by line (the person
chooses a side); webhooks or polling for repository changes (the check happens when the feature is opened or a sync
action runs); deleting working branches after the merge; draft pull requests.

## Anti-goals

Losing a developer's commit (no reset, no force push, nothing but the feature file is written); the hub overwriting
the repository without the person choosing when it changed; an import that silently drops what is on the branch;
writing to the repository the content of a hub-born draft before approval; a source branch of an import being modified.

## Constraints

Backend: alembic migration after `0044`, pytest, `ruff`, OpenAPI regenerated with `--apim-compatible`; works with the
GitHub client and with the local Git client (same interface). Frontend: hub tokens, Italian copy, Vitest, `pnpm lint`,
`npx tsc --noEmit`; read `node_modules/next/dist/docs/` before Next code. Repo content in English. No commits or PRs by
the assistant. Only the central repository is ever written.

## What exists today (facts the design builds on)

- The branch `qa-hub/<code>-r<N>` is created at approval by `publish_revision`; the file is written with the
  approved render and the PR opened. When a revision with an open PR is approved again, the branch is **reset to main**
  (`reset_branch`) and the file rewritten: this erases anything else on the branch and is removed by this design.
- `rev.pr_branch`, `pr_state`, `pr_number`, `base_commit_sha` describe the PR; a draft has none of them.
- The periodic sync reads only `main`; a merged PR is imported by `mark_revision_merged`, which turns differences into
  a `git` revision. Differences on a branch before the merge are not seen.
- Import from URL fills a draft; after the hub PR is opened `open_cleanup_pr` opens a second PR that removes the file
  from the source branch (`import_source.cleanup`, endpoint `/import-cleanup`, UI in the Git panel).
- Reopen creates a draft revision in the database only. The 3-way rebase (base / git / draft) handles the case where
  `main` moved after the draft was created.
- `TlGitClient` has `get_file`, `put_file`, `create_branch`, `branch_exists`, `head_sha`, `find_open_pull`; the file
  is identified on the branch by its blob sha.

## Approaches considered

A. Each scenario save commits to the branch. Simple to explain, but a commit per save is noise and each one needs a
   divergence check.
B. Save stays in the hub; one explicit action pushes the file with a single commit, plus a push when the revision is
   sent to review; a badge says what is not on the repository. Chosen (confirmed by the person).
C. Automatic periodic push. Hides when the repository changes and when conflicts appear; rejected.

## Design

### Data
`tl_feature_revisions.work_branch` (String(255), nullable) and `work_file_sha` (String(64), nullable): the blob sha of the
feature file as last pushed or accepted. A revision without `work_branch` behaves exactly as today. At publish,
`pr_branch` is the working branch when there is one.

### Sync state
For a revision with `work_branch`, compute `hub_sha` (git blob sha of the render of the hub content, computed locally)
and read the file on the branch (`repo_sha`). With `work_file_sha`:
`in_sync` (nothing changed or both equal), `hub_ahead` (only the hub changed), `repo_ahead` (only the repository
changed), `diverged` (both changed and differ). Also `branch_missing`, `file_missing`, `unreachable` and `not_configured`.
Equal content on both sides after a change counts as in sync and refreshes `work_file_sha`.

### Backend API (revision scoped, permission `edit:tl_feature` for the writes)
- `GET .../git-sync` returns `{branch, state, hub_unsynced: bool, repo_changed: bool, compare_url}`; one `get_file`
  call; never writes.
- `POST .../git-sync/push` (**Salva tutti**, draft only): pushes the feature file with one commit
  (`test(<scope>): <code> r<N>`). If the repository changed since the last sync it answers `409 repo_changed` unless
  `overwrite=true`. Creates the branch from `main` first when it does not exist (lazy creation, also covers a Git
  outage at Riapri). Never resets; writes only the file path.
- `POST .../git-sync/pull` (**Accetta dal repo**, draft only): reads the file from the branch, parses it (the same
  parser and tag rules as the import), replaces the draft's scenarios, bumps the lock, stores `work_file_sha`. A file
  that does not parse leaves everything unchanged and returns the reasons.
- In review and approved revisions are read-only: the state is shown as information and the changes on the branch are
  imported at merge as today.
- A per-revision advisory lock protects the three operations; no row lock is held during network calls.

### Workflow
- **Submit** pushes the file first (sync action), so the branch holds what is reviewed; when the state is
  `repo_ahead` or `diverged` the submit is blocked with the reason "Il repo è cambiato: accetta o sovrascrivi".
- **Publish** (approval) with a working branch: no reset. If the file on the branch differs from the approved render
  and the repository changed since the last sync, the branch file is left as it is (the merge import records it as a
  `git` revision, as for any edit after approval); otherwise the approved render is committed. The PR is opened from
  the working branch.
- **Reopen**: the action accepts an optional `branch_name`. The default is `qa-hub/<code>-r<N>`. The name is validated
  (no `..`, no spaces, not the base branch). The branch is created from `main` (existing branch: used as it is, its
  file is compared at the next open).
- **Import from URL** (central repository, any branch): after the content is in the draft, the working branch
  `qa-hub/<code>-r1` is opened from `main` with the file at its **original path**; the source branch is never touched
  and **no cleanup PR is opened**. `open_cleanup_pr`, `/import-cleanup` and the cleanup UI are removed (the old
  `import_source.cleanup` values stay readable).
- **Migration**: a draft revision created from Git content gets the same working branch as the import.

### Frontend
- Detail page: on load it calls `git-sync` for a revision with a working branch. `repo_ahead` and `diverged` open a
  dialog with the two choices (accept, overwrite) and the compare link; on in-review or approved revisions it is an
  information notice.
- Scenari tab: a **Salva tutti** button (saves all dirty scenarios, then pushes if there is a branch) and a badge
  "Non ancora sul repo" when `hub_unsynced`. Each scenario shows a badge next to Salva when its text has unsaved
  changes.
- Riapri: a confirmation popup says a feature branch is opened for the changes, with an optional name field
  prefilled with the default and a note that an existing branch is reused.
- Git panel: shows branch, state, last sync and the actions; the cleanup section goes away.

## Calls I made (to confirm)

1. **The working branch for an import starts from `main` with the file at its original path.** The alternative, starting
   from the developer's source branch, would drag the rest of that branch into the PR.
2. **Approval never overwrites a file that a developer changed.** It leaves it and lets the merge import record it.
3. **Submit pushes by itself**; Salva tutti is the manual push before that.
4. **The Git outage at Riapri does not block the reopen**: the branch is created at the first push.
5. **Cleanup endpoint and UI are removed**, which is an API change (only the hub frontend uses it).

## Left to the builder

Names of the endpoints' payload fields, wording of the dialogs and badges, how the compare link is built, whether the
state is cached for a few seconds, the migration rule that decides which migrated revisions are drafts with Git
content, and test fixtures. Delivery order: sync state and actions (backend), Salva tutti with badges (frontend),
working branch at import, migration and Riapri with the popup, removal of the cleanup PR.
