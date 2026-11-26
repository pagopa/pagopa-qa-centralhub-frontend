# Test Lifecycle: standard tag catalog, tag editing fixes, coloured file preview

Date: 2026-11-26
Repos: `pagopa-qa-centralhub-backend` (model, migration, parser, rules) and `pagopa-qa-centralhub-frontend`
(scenario editor, metadata, preview).
Size: a project (backend first, one branch per repo). It is project 1 of two: project 2, the synchronisation of
the feature file with the Git repository, is designed separately and builds on this one.

## Intent and why

The team wants the tags of every feature file to follow one standard, so that tests can be selected, reported
and tracked in the same way everywhere. Today the tags are free-form (a catalog filled by the Confluence migration),
the editor loses tags when a new one is added, and the file preview is plain text. This project defines the
standard, enforces it where it matters (sending a feature to review), fixes the editing bug, and makes the file
preview as readable as the scenario editor.

## Goals

1. A feature file declares its **test type**: exactly one of `@integration`, `@e2e`, `@api`. It is mandatory to send a
   feature to review.
2. Every scenario has exactly one **status** tag among `@runnable`, `@skip`, `@broken`, and one **polarity** tag
   (`@positive` or `@negative`, already a separate field; the file spelling becomes English, the parser still reads the Italian `@positivo`/`@negativo`, DB and API values stay `positivo`/`negativo`). `@flaky` is optional. Any other tag is a **custom** tag,
   free in the name (format check only).
3. Editing tags never loses tags: adding or removing one leaves all the others untouched, custom tags included,
   and a removed tag can always be added again.
4. Tags that exist today and do not fit the standard are brought to it by a **proposed cleanup**, never by a silent
   rewrite.
5. The "Anteprima file" tab colours keywords, tags and comments like the scenario editor.

## Non-goals

Synchronising the file with Git (project 2); tag-based reporting or filters in the tables; importing from
repositories other than the central one; a test type per scenario or per revision; renaming a tag across all scenarios.

## Anti-goals

A tag disappearing from a scenario because another one was toggled; a file imported from Git being rejected or
silently stripped of tags because they are not in a catalog; existing features losing data in the migration;
the rules blocking saving (they block sending to review only, so work in progress is never obstructed); colour as
the only carrier of meaning in the preview (the text of every tag stays).

## Constraints

Backend: alembic migration after the current head (`0043`), pytest, `ruff`, OpenAPI regenerated with
`--apim-compatible`. Frontend: hub tokens, Italian UI copy, Vitest, `pnpm lint`, `npx tsc --noEmit`; read
`node_modules/next/dist/docs/` before writing Next code. Repo content (code, comments, commits) in English. No
commits or PRs by the assistant. Existing rendered files must not change when nothing was edited: the order of
tags in the file stays "extra tags, then polarity".

## What exists today (facts the design builds on)

- Scenario tags are stored in `tl_scenario_contents.extra_tags` (JSONB list, no `@`) plus the `polarity` enum.
  `ALLOWED_EXTRA_TAGS = runnable, e2e, ui, skip` (backend `gherkin.py`, mirrored in the frontend
  `src/lib/test-lifecycle.ts`). Other allowed names live in `tl_category_tags`, filled by the migration's
  keep/discard decisions. `check_extra_tags` rejects names outside that set (API error), and the feature-file parser
  silently drops tags that are not in it (`_parse_scenario`).
- The scenario editor's `toggleTag` rebuilds the list on adding from `ALLOWED_EXTRA_TAGS` only, so every tag outside
  the four base ones is lost when another is added. The picker offers catalog tags plus those on the scenario, so a
  removed non-catalog tag cannot be switched on again. This is the reported bug.
- The feature file is rendered by `render_feature_file`; its feature tag line is `@<SCOPE>_<NNN>` and the parser takes
  the first tag of the feature as the identity tag.
- Sending to review is gated by `_submit_reasons` in `workflow.py`; the frontend shows the reasons.
- The preview tab shows the text produced by the backend; a line highlighter already exists
  (`src/lib/gherkin-highlight.ts`, used by the steps editor).

## Approaches considered

A. Store every tag in the existing `extra_tags` list and enforce the standard as validation rules plus a feature
   column for the test type. No change to the scenario tables; the render and parse paths stay as they are.
B. New typed columns on the scenario (`status`, `flaky`, `custom_tags`) and drop `extra_tags`. Cleaner data, but it
   touches rendering, parsing, the 3-way rebase, history snapshots and every test for a gain the rules do not need.
C. Keep the catalog as the gate and add the new tags to it. Does not allow custom tags, which the team asked for.

Chosen: **A**. The standard is a set of reserved names with rules; everything else is a custom tag.

## Design

### Reserved names and rules
- Status: `runnable`, `skip`, `broken` (exactly one per scenario). Optional: `flaky`. Polarity: `positive`,
  `negative` (already in the `polarity` field, never in `extra_tags`). Test type (file level): `integration`, `e2e`,
  `api`.
- Custom tag: matches the existing format (`^[A-Za-z][A-Za-z0-9_-]{0,49}$`) and is not a reserved name or an
  identity tag (`@XXX_NNN`, `@XXX_NNN_NN`).
- Saving a scenario accepts any combination (format only). **Sending to review** adds two reasons to
  `_submit_reasons`: "Manca il test-type del file" and, per scenario, "Lo scenario <tag> deve avere uno e un solo
  tag tra @runnable, @skip, @broken". Polarity is always set (default positive), so it cannot be missing.
- A new scenario starts with `@runnable` and `@positive`.

### Backend
- `tl_features.test_type`: nullable `String(16)` with a check on the three values. Exposed in feature create, update
  and detail. The file renderer writes it on the feature tag line (`@POS_006 @integration`). Written in feature
  detail/list responses so the table can show it later.
- Parser: the feature identity tag is the one that matches the identity pattern, not "the first tag", so a file with
  `@integration` before `@POS_006` is read correctly; the other feature-level tags give `test_type` when one is in the
  set. Scenario tags: everything that is not an identity tag or a polarity becomes an extra tag (the "allowed" filter
  is removed). Import and sync set `test_type` on the feature when the file declares it (system event in the
  history when it changes).
- `check_extra_tags` and `UnknownExtraTagError` stop gating: the service validates the format and the reserved-name
  rule only. `tl_category_tags` stays as a source of suggestions (the migration's "keep" decisions still add to
  it); `GET category-tags` returns those plus the tags currently in use, for autocomplete.
- Alembic `0044`: add `test_type`; backfill it from the scope's `repo_folder` (`src/integration` →
  `integration`, `src/e2e` → `e2e`, `src/api` → `api`; no match → NULL); in every revision's scenario contents,
  ensure exactly one status tag: keep `skip`/`broken` if present, otherwise `runnable` (if both `runnable` and
  `skip` are present, `skip` wins). Idempotent; downgrade leaves the data as is.
- Cleanup of the old test-type tags on scenarios: a read endpoint reports, for a feature, the scenarios that carry
  `e2e`, `integration` or `api` as scenario tags (the test type belongs to the file); the apply endpoint removes
  them from the scenarios and sets the file's test type when it is empty (and refuses when the tags disagree with a
  type already set). Draft revisions of editable features only.

### Frontend
- Scenario editor: the tag area becomes three groups, in this order. **Stato**: a single choice among
  `@runnable`, `@skip`, `@broken`. **Polarità**: as today. **Altri tag**: a `@flaky` toggle and the custom tags as
  removable chips plus an input with autocomplete from the suggestions. Toggling or removing changes only that tag.
  Reserved names typed in the custom input are routed to their control, not stored as custom.
- Metadata panel and creation dialog: a "Test type" select (`integration`, `e2e`, `api`), preselected from the
  scope folder when it matches. Missing value shows as a hint in the readiness checklist.
- Cleanup: in the Scenari tab of a draft, a notice "N scenari hanno @e2e/@integration/@api: il test-type
  appartiene al file" with a button that previews and applies the cleanup.
- Preview: render the lines with the existing highlighter (extended with `Funzionalità`, `Schema dello scenario`,
  `Esempi`, `Esigenza di Business`, `Abilità`, `Regola`), tags in the tag colour, `#` comments muted, table rows
  dimmed. Same tokens as the steps editor, dark theme included; the text stays selectable and the copy button
  copies the plain file.

## Calls I made (to confirm)

1. **Test type is on the feature, not on the revision.** Cheaper (no change to the 3-way rebase); cost: a change of
   test type is not versioned in the revision history, only in the event log.
2. **The cleanup targets `@e2e`, `@integration` and `@api` on scenarios.** `@ui` is not a test type, so it stays a
   custom tag. If you want `@ui` handled differently, say so.
3. **Missing or wrong tags on a file imported from Git do not open an anomaly.** They show up in the readiness
   checklist and block only the submission. This avoids a new anomaly type for something visible anyway.
4. **When both `runnable` and `skip` are on a scenario, the backfill keeps `skip`** (the safe side: nothing runs
   by mistake).
5. **The catalog table stays** as a suggestion source rather than being dropped, so the migration's decisions
   keep their effect.

## Left to the builder

Names and exact shape of the cleanup endpoints; wording of the notices; the visual design of the status and chip
controls; how suggestions are cached; test fixtures. The order of the work (backend model, rules and parser first;
then editor; then preview) is free as long as the backend lands before the frontend.
