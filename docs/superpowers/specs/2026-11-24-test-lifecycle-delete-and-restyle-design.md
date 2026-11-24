# Test Lifecycle: delete scopes/features, Jira confirmation, restyle

Date: 2026-11-24
Repos: `pagopa-qa-centralhub-backend` (BE), `pagopa-qa-centralhub-frontend` (FE)
Size: project (new BE endpoints + new FE components + restyle). Two branches/PRs, BE first.

## Intent and why

Users of the Test Lifecycle section can create scopes (ambiti) and features but cannot remove
them, so test data and mistakes pile up. They also want the section to feel like the
Non-Regression Tests (NRT) section, which was recently restyled (mono labels, coloured
buttons, row action icons). When something linked to Jira is deleted, the user must decide
explicitly whether the Jira issues go away too.

## Goals

1. Delete a scope and delete a single feature from the UI.
2. On delete, show a dialog listing the linked Jira issues; the user chooses which ones to
   delete in Jira, or none (leave them untouched).
3. Restyle the Test Lifecycle list page and the feature detail chrome to match NRT:
   label fonts, button classes, row action icons (view, delete).

## Non-goals

- Deleting anything that already exists in Git (see rules). No Git PR flow for deletion.
- Soft delete / undo / trash bin.
- Changes to the editing experience inside the feature detail tabs (Scenari, Review, ...).
  Those are proposed separately as follow-up suggestions.
- Changing the Jira creation flow.

## Anti-goals

- Never delete a Jira issue the user did not explicitly select.
- Never leave the hub inconsistent with Git (a feature deleted in the hub that comes back on
  the next sync).
- Never delete the shared Epic QA by default.

## Decisions taken with the user

- **Published features are not deletable (option 1).** A feature is deletable only if it has
  no published revision and no Git file (`published_revision_id` is null and `git_path` is
  null). Otherwise the delete icon is disabled with a tooltip explaining why.
- **Scope deletion** is allowed only if every feature of the scope is deletable; otherwise it
  is blocked and the dialog names the blocking features. An empty scope is always deletable.
- **Jira preselection:** design and implementation issues of the affected features are
  preselected; the scope's Epic QA is NOT preselected.

## Approaches considered

For the Jira deletion flow:
- A. Delete the DB rows and Jira issues in one request, with the explicit list of keys chosen
  by the user. **Chosen** (simple, one confirmation).
- B. Two-step: delete in the hub, then a separate "clean up Jira" action. Rejected: leaves
  orphan Jira issues if the user forgets, and the linkage is gone after step one.

For the dialog data:
- A. Dedicated `delete-preview` endpoints computing blockers and Jira issues server side.
  **Chosen** (scope preview needs an aggregate across features; the server is the single
  source of truth for "deletable").
- B. Compute in the FE from existing list/detail data. Rejected: duplicates the rule and
  needs one call per feature for scope deletion.

## Design

### Backend

New endpoints under `/api/v1/test-lifecycle` (additive, existing `actor_email` convention):

- `GET /features/{id}/delete-preview` and `GET /scopes/{id}/delete-preview`, returning:
  `deletable: bool`, `blockers: [{feature_id, code, reason}]`, `features: [{id, code, title}]`
  affected, and `jira_issues: [{key, role (design|impl|qa_epic), summary, status, url,
  feature_code|null, default_selected: bool}]`. `qa_epic` has `default_selected = false`; the
  scope preview includes the scope's Epic, the feature preview includes only design/impl
  (the feature-level override epic is never offered).
- `DELETE /features/{id}` and `DELETE /scopes/{id}`, body: `actor_email`,
  `delete_jira_keys: list[str]`. The server rejects keys not linked to the entity, re-checks
  deletability (409 `feature_published` / `scope_has_published_features`), deletes the DB rows
  (cascade already covers revisions, scenarios, history, comments), then deletes the selected
  Jira issues best-effort via a new `TlJiraClient.delete_issue` (`DELETE
  /rest/api/3/issue/{key}`, no subtask deletion). Response lists per-key results
  (`deleted | failed` with reason) so the UI can show partial failures. Jira failures do not
  roll back the DB deletion.
- Also blocked: a feature whose working revision has an open PR (`pr_*` set) — my call, to
  avoid orphaning a PR; builder to confirm the exact field.
- Open anomalies (`TlIssue`) referencing deleted features must not remain dangling (cascade or
  resolve; builder to check the FK).
- Log actor, entity and deleted keys at info level.
- Tests in `tests/test_tl_*.py`; regenerate OpenAPI per BE `CLAUDE.md`.
- Permissions are not enforced by the BE today; the FE gates the actions.

### Frontend

- New `TlDeleteDialog` (based on the `ConfirmDelete` pattern): title, what will be removed
  (counts of features/scenarios), blockers if any (delete button disabled), Jira checklist
  with "select all / none", error area, `Annulla` + red `Elimina`. Partial Jira failures are
  shown after the delete with the failed keys.
- Hooks in `useTestLifecycle.ts`: delete-preview queries, delete mutations that invalidate
  scopes/features/issues queries. Types in `src/types/test-lifecycle.ts`.
- Feature list (`FeatureTable`): new actions column with icon buttons using the NRT
  `ROW_ICON_CLASS` (`Eye` opens the detail, `Trash2` deletes; no separate edit icon because
  the detail page is the editor — my call). Row click propagation stopped as in NRT.
- Scope cards (`ScopeOverview`): cards become non-button containers (no nested buttons) with
  an icon cluster (edit opens the scope manager on that scope, delete). `ScopeManagerDialog`
  list gets a delete icon next to the pencil. Scope actions gated by `manage:tl_scopes`,
  feature delete by `edit:tl_feature` (my call: only unpublished drafts can be deleted, so
  the blast radius is small).
- Delete on the feature detail header too (same dialog), gated the same way.
- Restyle: header buttons use `PRIMARY_BUTTON_CLASS` / `SECONDARY_BUTTON_CLASS`; table header
  `font-mono text-[11px] uppercase`; filter labels in the NRT label style; numeric columns in
  mono; detail header action buttons and tabs aligned to the same tokens. Light and dark mode
  must keep working; UI copy stays Italian.
- Tests: Vitest co-located (`FeatureTable`, `ScopeOverview`, dialog, page tests updated).
  Base UI popover hangs in jsdom: use `src/test/popover-mock.tsx`.

## Constraints

- FE: read `node_modules/next/dist/docs/` before writing Next code (repo AGENTS.md); pnpm
  only; run `pnpm test` and `pnpm lint`.
- BE: additive API changes, OpenAPI regeneration, `uv run pytest`, `uv run ruff check .`.
- No commits, pushes or PRs by the assistant: the user does them.

## Left to the builder

Exact column widths and icon choices, copy wording in Italian, the precise PR-open check,
the FK behaviour of anomalies, and the Jira error mapping.

## Follow-ups (not in this change)

Improvements to the detail-page editing experience, proposed separately.
