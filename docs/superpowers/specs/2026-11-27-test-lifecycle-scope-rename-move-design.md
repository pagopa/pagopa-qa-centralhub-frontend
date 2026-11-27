# Test Lifecycle: renaming scopes and moving features between scopes

Date: 2026-11-27
Repos: `pagopa-qa-centralhub-backend` (services, API, migration PR) and `pagopa-qa-centralhub-frontend`
(scope cards and dialog, feature table, feature detail).
Size: a project (backend first, one branch per repo). This replaces an earlier draft that kept the old
scope code inside the moved features forever; the team wants the features to take the new scope.

## Intent and why

The migration of WISP created two scopes from two sub-folders (`nodoInviaCarrelloRPT`, `nodoInviaRPT`) of
`src/integration/wisp/features`, while the sub-folders were only a logical organisation and all the features belong to
WISP. The scope code cannot be changed once a scope has features and a feature cannot leave its scope, so the wrong
scopes cannot be fixed. The team would rather make the application flexible, so that scopes and features can be
reorganised freely, than correct the migration, which will not be needed for long. The scope code is part of the
feature code (`FEAT_004_NodoInviaCarrelloRPT`) and of the scenario tags (`@NODOINVIACARRELLORPT_004_01`), so the
reorganisation must be able to give the features the identifiers of their new scope.

The migration alignment pull requests of these two scopes are **not merged yet**: on `main` the files still carry
their original tags, so the new identifiers can be assigned in the hub and carried to the repository by the alignment
pull request, which the hub already regenerates from its own content.

## Goals

1. A scope can be **renamed**: its name always, its code also when it has features. Changing the code re-keys all its
   features (see below).
2. Features can be **moved** to another scope, one or many at a time, with the choice to **adapt** them (new code,
   new number, new scenario tags in the target scope) or to **keep** their identifiers (regrouping only).
3. Adapting is allowed only for features that are **not on the repository with their hub identifiers**; otherwise the
   operation is refused with the list of the blocking features, and nothing changes.
4. Old identifiers stay usable: the previous scenario tags become aliases, so NRT executions keep their link.
5. The open migration alignment pull requests follow the change: the destination scope gets (or updates) its pull
   request, and a source pull request that no longer has anything to carry is closed.
6. The scope name is the main title in the UI; the code is shown next to it as a label.

## Non-goals

Re-keying a feature that is already on `main` with hub identifiers (it needs its own pull request: a later project);
moving or renaming files in the repository (the file keeps its path); changing a feature's title; merging two scopes
(move everything, then delete the empty scope); re-pointing existing Jira tasks.

## Anti-goals

A re-key that leaves a feature half renamed (code, tags and numbers are changed together or not at all); a bulk
operation applied to only some of the features; two features with the same code or the same scenario tag; NRT
executions losing their link; the hub writing to any repository other than the central one; an open alignment pull
request left carrying a file for a feature that moved to another scope.

## Constraints

Backend: alembic migration only if the design needs a column (it does not), pytest, `ruff`, OpenAPI regenerated with
`--apim-compatible`. Frontend: hub tokens, Italian copy, Vitest, `pnpm lint`, `npx tsc --noEmit`; read
`node_modules/next/dist/docs/` before Next code. Repo content in English. No commits or PRs by the assistant.
Scope codes keep the existing format (letters and digits, 2-20 characters, no spaces): the free-form label is the name.

## What exists today (facts the design builds on)

- `update_scope` refuses a new code as soon as the scope has features (`ScopeCodeLockedError`).
- A feature has `code` (`FEAT_<NNN>_<scope code>`, unique), `number` (unique per scope, from the scope's counter) and
  `scope_id`; its scenarios have a stored tag (`@<SCOPE>_<NNN>_<NN>`); the feature tag and the scenario tags are
  computed from the scope code and the number in `gherkin.py`, `history.py`, `features.py`, `git_import_content.py`,
  `branch_sync.py` and `feature_parser.classify`.
- `tl_scenario_aliases` holds historical tags that still identify a scenario for the NRT executions.
- A migrated feature that is already published has `alignment_pending = true` until its alignment pull request is
  merged; the alignment pull request is one per scope (`qa-hub/migration-<scope code>`), regenerated from the hub
  content by `migration_align.open_alignment_pr` and selected by the migration item's scope code.
- The Git client can create branches, write files and open pull requests; it cannot close one.

## Approaches considered

A. **Adapt on move and on rename (chosen).** The identifiers are recomputed from the new scope in the hub; the
   alignment pull request carries them to the repository. Works while the files are not yet on `main` with hub tags.
B. Stable identity, never changing codes or tags. Cheap, but the moved features would keep the wrong scope name
   forever, which is what the team wants to get rid of.
C. Rewrite everything through a new pull request for every feature, also those already merged. Right in the long run,
   too large for this need: left as a later project.

## Design

### Which features can be adapted
A feature can be adapted when it has no revision with an open pull request of its own and its file is not on `main`
with hub identifiers: it has no published revision, or its published revision comes from a migration with
`alignment_pending` true. Anything else is **blocked**. A move that keeps the identifiers has no restriction.

### Operations (one transaction each, scopes and features locked in a fixed order, refused while a migration runs)
- **Move** (`POST /features/move`, `{feature_ids, target_scope_id, adapt, actor_email}`): with `adapt` every feature
  gets the target `scope_id`, a number from the target's counter, the code `FEAT_<number>_<target code>` and new
  scenario tags; the previous scenario tags are added as aliases. Without `adapt` only `scope_id` and `number`
  change. A feature already in the target is skipped. If any feature is blocked or unknown the whole request fails
  with the list and nothing is applied. One history event per feature (`tl.feature.moved`, old and new scope, old and
  new code).
- **Rename a scope's code** (`PATCH /scopes/{id}` with a new `code`): the same adaptation applied to all its features
  (numbers unchanged, the code suffix and the tags change); refused with the blocking features if any cannot be
  adapted. Renaming only the name never touches the features.
- The feature list and detail also expose `scope_name`.

### Migration alignment pull requests
After a successful operation that touched features with `alignment_pending`, the hub refreshes the alignment pull
requests: the destination scope's pull request is created or updated from the hub content (the selection of the
features becomes "the feature's current scope" instead of the migration item's scope code); for a source scope that
had a pull request, the files of the features that left are restored on its branch to their `main` content, and when
no file is left to carry the pull request is closed (a new `close_pull` on the Git client) and the scope's state
recorded. A Git failure does not undo the operation: it is recorded as the scope's `pr_error` and can be retried
with the existing migration action.

### Frontend
- Scope cards and the scope picker show the name as the title and the code next to it as a label.
- The scope dialog makes the code editable. When some features cannot be adapted it lists them and does not save.
- The feature table gets row selection and a "Sposta in…" button; the detail header gets the same action. The dialog
  asks for the target scope and for "Adegua codice e tag" (on by default when every feature can be adapted, off and
  explained when some cannot), shows what changes (code, number, tags, the Epic QA of future Jira tasks) and what
  does not (file path, existing Jira tasks) and reports the result.

## Calls I made (to confirm)

1. **Adapting is limited to features that are not on `main` with hub identifiers.** It covers the WISP case
   (migration not merged) and refuses the rest with a clear list, instead of silently producing inconsistent files.
2. **A scope's code can be renamed even with features**, as a bulk adaptation, under the same limit.
3. **No new column, no data migration:** identifiers stay derived from scope code and number.
4. **The hub closes an alignment pull request that has nothing left to carry**, through a new `close_pull`. A closed
   pull request can be reopened on GitHub.
5. **The file keeps its path** (`.../nodoInviaCarrelloRPT/...`): moving features does not move files.
6. **Old scenario tags become aliases**, so the NRT history stays linked.

## Left to the builder

Names and error codes of the endpoints, how the blocked list is shaped, how the alignment refresh is split into
functions, the dialog markup and wording, and the test fixtures. Delivery order: the adaptation core and the move
endpoint, the scope code rename, the alignment refresh, then the UI.
