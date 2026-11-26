# Test Lifecycle Tag Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standard tags (file test-type; scenario status/polarity/flaky/custom) enforced at submit time, tag editing that never loses tags, and a coloured file preview.

**Architecture:** All scenario tags stay in `extra_tags` (status, flaky, custom); polarity stays its own field; the test type is a new column on `tl_features`. A pure module `tags.py` holds the vocabulary and rules. The catalog stops being a gate (suggestions only). The parser and the import paths keep every tag. The editor is rebuilt around the same vocabulary, mirrored in the frontend.

**Tech Stack:** FastAPI, SQLAlchemy async, alembic, pytest, ruff (backend at `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-backend`); Next.js 16, React 19, Vitest, pnpm (frontend at `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-frontend`).

**Spec:** `docs/superpowers/specs/2026-11-26-test-lifecycle-tag-catalog-design.md` (frontend repo).

## Global Constraints

- Alembic migration is `0044`, after `0043_revision_jira_keys.py`; idempotent; downgrade drops only `test_type`.
- Vocabulary: `TEST_TYPES = ("integration", "e2e", "api")`; `STATUS_TAGS = ("runnable", "skip", "broken")`; optional tag `flaky`; polarity `positive`/`negative` (field `polarity`, never in `extra_tags`).
- Custom tag format `^[A-Za-z][A-Za-z0-9_-]{0,49}$` (existing `_EXTRA_TAG_RE`); never a polarity name or an identity tag (`@XXX_NNN`, `@XXX_NNN_NN`).
- Saving a scenario never enforces the status rule; only `_submit_reasons` does. Reason texts (exact): `Manca il test-type del file`; `Lo scenario {tag} deve avere uno e un solo tag tra @runnable, @skip, @broken`.
- A new scenario starts with `extra_tags == ["runnable"]` and polarity positive.
- File render keeps the order "extra tags, then polarity" for scenarios; feature tag line is `@<SCOPE>_<NNN>` followed by `@<test_type>` only when `test_type` is set (a feature with no test type renders exactly as today).
- Backfill touches the scenarios of DRAFT revisions only (anything else mirrors the repo file); polarity spelling in files is English (`@positive/@negative`), the parser reads both, DB/API values unchanged.
- Backfill status rule (ruling beyond the spec's runnable/skip pair): keep exactly one, precedence `skip` > `broken` > `runnable`; none present → `runnable`; polarity names are removed from `extra_tags`.
- UI copy in Italian; repo content (code, comments, commits) in English; no raw hex in components. Backend: `ruff check`, pytest green, OpenAPI regenerated with `.venv/bin/python -m scripts.generate_openapi --apim-compatible`. Frontend: `pnpm test`, `pnpm lint`, `npx tsc --noEmit` green; read `node_modules/next/dist/docs/` before Next code. The assistant never commits.

## Review Focus

- Adding, removing or toggling one tag in the editor leaves every other tag (custom ones included) untouched, and a removed custom tag can be added again.
- Existing data after `0044`: a scenario with `runnable`+`skip`, with none, or with `positive` in `extra_tags` ends with exactly one status and no polarity duplicate; running the backfill twice changes nothing.
- A Git file with `@integration` placed before the identity tag, or with unknown custom tags, is read without rejecting or dropping anything and sets the feature's `test_type`.
- A feature with no `test_type` renders the same file as before this change (golden test), tag order unchanged, so no spurious diffs against the repo.
- A scenario without a status tag, or still carrying a legacy `@e2e`, can be saved; only submit is blocked, with the exact reason.

---

### Task 1: Tag vocabulary and rules (pure module)

**Files:**
- Create: `app/services/test_lifecycle/tags.py`
- Test: `tests/test_tl_tags.py`

**Interfaces:**
- Produces: `TEST_TYPES`, `STATUS_TAGS`, `FLAKY_TAG`, `POLARITY_TAGS`; `normalize_status(extra: Iterable[str]) -> list[str]` (backfill rule above, order-stable, deduplicated, polarity names removed); `status_count(extra: Iterable[str]) -> int`; `legacy_test_type_tags(extra: Iterable[str]) -> list[str]` (those of `TEST_TYPES` present); `default_test_type(repo_folder: str | None) -> str | None` (`src/integration…`→`integration`, `src/e2e…`→`e2e`, `src/api…`→`api`, leading/trailing slashes ignored, else `None`); `TEST_TYPE_MISSING_REASON`, `status_reason(tag: str) -> str`.

- [ ] **Step 1: Failing tests** in `tests/test_tl_tags.py`: `normalize_status(["runnable","skip"]) == ["skip"]`; `(["broken","runnable"]) == ["broken"]`; `([]) == ["runnable"]`; `(["smoke","positive"]) == ["smoke","runnable"]`; idempotent on its own output; `default_test_type("src/integration/fdr")=="integration"`, `("/src/e2e/")=="e2e"`, `("src/api")=="api"`, `("docs")` and `(None)` are `None`; `legacy_test_type_tags(["e2e","smoke","api"])==["e2e","api"]`; the two reason texts are exact.
- [ ] **Step 2: Run** `.venv/bin/pytest tests/test_tl_tags.py -v`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the module with the signatures above (pure functions, no DB).
- [ ] **Step 4: Run** the file. Expected: PASS.

### Task 2: Model column and migration 0044

**Files:**
- Modify: `app/models/test_lifecycle.py` (`TlFeature`)
- Create: `alembic/versions/0044_feature_test_type_and_status_tags.py`
- Test: `tests/test_tl_tag_backfill.py`

**Interfaces:**
- Consumes: Task 1 `normalize_status`, `default_test_type`.
- Produces: `TlFeature.test_type: Mapped[str | None]` (`String(16)`, check constraint on `TEST_TYPES`).

- [ ] **Step 1: Failing tests**: (a) `test_feature_has_test_type_column` (reload in a fresh session, as the column test of `test_tl_jira_history.py` does, so it cannot pass vacuously); (b) `test_backfill_test_type_from_scope_folder` for `src/integration/x`, `src/e2e`, `src/api` and a non-matching folder (stays NULL; an already set value is not overwritten); (c) `test_backfill_status_tags` over scenario contents with `["runnable","skip"]`, `[]`, `["smoke","positive"]`, `["broken"]`; (d) running the backfill twice gives the same data. Load the migration by file path with `importlib.util.spec_from_file_location` (as in the Jira-history migration test) and call its exported SQL/functions.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the model column; the migration adds `test_type` and runs the two backfills (test type via SQL on `tl_scopes.repo_folder` prefixes; status tags per `tl_scenario_contents` row in Python through `normalize_status`, updating only rows whose value changes). Downgrade drops the column.
- [ ] **Step 4: Run** the file, then `.venv/bin/alembic upgrade head` on the dev DB. Expected: PASS, upgrade OK (ask the person to start Postgres if it is down).

### Task 3: Schemas, services and scenario defaults

**Files:**
- Modify: `app/schemas/test_lifecycle.py`, `app/services/test_lifecycle/features.py` (`create_feature`, `update_feature`, scenario creation near line 596, `update_scenario`), `app/services/test_lifecycle/category_tags.py`, `app/api/v1/test_lifecycle.py` (`UnknownExtraTagError` mapping, `/category-tags`)
- Test: `tests/test_tl_tag_rules.py`, `tests/test_tl_category_tags.py` (update)

**Interfaces:**
- Consumes: Task 1.
- Produces: `TlFeatureCreate.test_type`, `TlFeatureUpdate.test_type` (`Literal["integration","e2e","api"] | None = None`); `test_type: str | None = None` on `TlFeatureDetail` and `TlFeatureListItem`; `category_tags(db) -> tuple[str, ...]` now returns the table's names plus the tags currently used on scenarios (suggestions, not a gate); `check_extra_tags` and `UnknownExtraTagError` removed.

- [ ] **Step 1: Failing tests**: create without `test_type` takes `default_test_type(scope.repo_folder)`; create/update with an explicit value stores it; update with an invalid value is 422; a new scenario has `extra_tags == ["runnable"]`; updating a scenario with `["skip","anything_custom"]` succeeds; with `["positive"]` or an identity-shaped tag is 422 (format message); with `["e2e"]` (legacy) succeeds; `GET /category-tags` includes a tag used on a scenario but absent from the table.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the schema fields and the extra-tag validator (format, no polarity names, no identity shape); write `test_type` in create/update/detail/list; set the default `["runnable"]` for new scenarios; remove the catalog gate and its API error mapping; widen `category_tags`.
- [ ] **Step 4: Run** the two files and `tests/test_tl_features.py`. Expected: PASS.

### Task 4: Submit rules

**Files:**
- Modify: `app/services/test_lifecycle/workflow.py` (`_submit_reasons`)
- Test: `tests/test_tl_tag_rules.py`

**Interfaces:**
- Consumes: Task 1 (`status_count`, reason texts), `TlFeature.test_type`, `view.scenarios[*].extra_tags` and `.tag`.

- [ ] **Step 1: Failing tests**: a ready feature with `test_type=None` lists `Manca il test-type del file`; with it set the reason is gone; a scenario with no status tag, and one with two, each add the exact scenario reason; a scenario with exactly one is clean. Existing ready-feature fixtures in `tests/test_tl_workflow.py` and `tests/test_tl_rebase.py` get `test_type="integration"` and a status tag where needed.
- [ ] **Step 2: Run** `tests/test_tl_tag_rules.py`. Expected: FAIL.
- [ ] **Step 3: Implement** the two reasons in `_submit_reasons`.
- [ ] **Step 4: Run** `tests/test_tl_*.py`. Expected: PASS.

### Task 5: Render and parse the test type; keep every tag

**Files:**
- Modify: `app/services/test_lifecycle/gherkin.py` (`RenderFeature`, `render_feature_file`), `app/services/test_lifecycle/feature_parser.py` (`ParsedFeature`, `parse_feature_file`, `_parse_scenario`, `_canonical`, `classify`), `app/services/test_lifecycle/history.py` (`build_render`), `app/services/test_lifecycle/git_import_content.py` (render construction)
- Test: `tests/test_tl_gherkin.py`, `tests/test_tl_feature_parser.py`

**Interfaces:**
- Produces: `RenderFeature.test_type: str | None = None`; `ParsedFeature.test_type: str | None = None`; `parse_feature_file(text, allowed_extra: Iterable[str] | None = None)` where `None` keeps every scenario tag that is neither an identity tag nor a polarity (the filter applies only when an iterable is passed).

- [ ] **Step 1: Failing tests**: golden render of a feature with `test_type=None` equals today's output byte for byte; with `"integration"` the tag line is `@POS_006 @integration`; parsing `@integration @POS_006` yields `feature_tag=="@POS_006"` and `test_type=="integration"`; parsing a feature with no test tag gives `None`; a scenario with `@smoke @custom_x @runnable @positive` keeps `["smoke","custom_x","runnable"]`; `classify` does not report a structural change when only the test-type tag is present or absent; render then parse is a fixed point for tags.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**: the feature identity tag is the first tag matching the existing identity pattern (fall back to the first tag); feature-level tags in `TEST_TYPES` set `test_type`; `build_render` and `git_import_content` pass `feature.test_type`; default `allowed_extra=None` everywhere the module defaults used `ALLOWED_EXTRA_TAGS`.
- [ ] **Step 4: Run** both files and `tests/test_tl_git_import.py`. Expected: PASS.

### Task 6: Import paths keep tags and set the test type

**Files:**
- Modify: `app/services/test_lifecycle/git_import.py`, `git_import_file.py`, `migration.py` (`_scenarios_from_file`, `_feature_tags` use)
- Test: `tests/test_tl_import_git.py`, `tests/test_tl_git_import.py`, `tests/test_tl_migration_execute.py`

**Interfaces:**
- Consumes: Task 5.
- Produces: `_scenarios_from_file(..., keep: set[str] | None, ...)` where `None` keeps every tag; feature-level `TEST_TYPES` tags are never pushed onto scenarios.

- [ ] **Step 1: Failing tests**: importing a file into a draft keeps unknown custom tags (the `ignored` warning list is empty for them) and sets the feature's `test_type` from the file's feature tag; the sync import of a changed file on main updates `test_type` and records a system history event only when the value changes; the Confluence migration still honours keep/discard decisions (`keep` set passed) and does not turn a feature-level `@e2e` into a scenario tag.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**: `git_import_file` and the sync path pass `None`/keep-all; `_scenarios_from_file` excludes test-type names from `pushed`; set `feature.test_type` where a parsed feature carries one (no overwrite with `None`).
- [ ] **Step 4: Run** the three files plus `tests/test_tl_migration_*.py`. Expected: PASS.

### Task 7: Cleanup of test-type tags on scenarios

**Files:**
- Modify: `app/services/test_lifecycle/features.py` (or a new `tag_cleanup.py` next to it), `app/schemas/test_lifecycle.py`, `app/api/v1/test_lifecycle.py`, `openapi/qa-hub-be.json`
- Test: `tests/test_tl_tag_cleanup.py`

**Interfaces:**
- Consumes: Task 1 `legacy_test_type_tags`; same actor/lock/draft rules as `update_scenario`.
- Produces: `TlTagCleanupRow(scenario_tag: str, tags: list[str])`; `TlTagCleanup(rows: list[TlTagCleanupRow], proposed_test_type: str | None, conflict: str | None)`; `GET /features/{feature_id}/tag-cleanup -> TlTagCleanup` (working revision; empty rows when nothing to clean); `POST /features/{feature_id}/tag-cleanup` (body `{actor_email}`) applies it and returns `TlFeatureDetail`.

- [ ] **Step 1: Failing tests**: GET lists only scenarios carrying `e2e|integration|api`; `proposed_test_type` is the single type found, or `None` with `conflict` set when the tags disagree among themselves or with a non-empty `feature.test_type`; POST removes those tags from the scenarios and sets `test_type` when empty; POST with a conflict is 409 and changes nothing; non-draft revision or missing editor rights are refused like other scenario edits; `ui` and other custom tags are untouched.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** with one transaction, feature then revision locks, a history event, and bump of the draft's lock version consistent with scenario edits.
- [ ] **Step 4: Regenerate OpenAPI** with `--apim-compatible`; run `ruff check` and the full `tests/test_tl_*.py`. Expected: green.

### Task 8: Frontend vocabulary, types and hooks

**Files:**
- Modify: `src/lib/test-lifecycle.ts`, `src/types/test-lifecycle.ts`, `src/hooks/useTestLifecycle.ts`
- Test: `src/lib/test-lifecycle.test.ts`

**Interfaces:**
- Produces: `TEST_TYPES`, `STATUS_TAGS`, `FLAKY_TAG`, `RESERVED_TAGS` (status, flaky, polarity names, test types); `setStatusTag(tags: string[], status: StatusTag): string[]` (replaces any status tag, keeps all others and their order); `toggleFlaky(tags: string[]): string[]`; `addCustomTag(tags: string[], raw: string): { tags: string[]; error?: string }` (trims, strips a leading `@`, rejects invalid format or reserved names with an Italian message, ignores duplicates); `removeTag(tags: string[], tag: string): string[]`; types `TestType`, `TlTagCleanup`; `test_type` on `TlFeatureDetail`, `TlFeatureListItem` and the create/update payloads; hooks `useTlTagCleanup(featureId: string)` and `useApplyTlTagCleanup()`; `ALLOWED_EXTRA_TAGS` is removed.

- [ ] **Step 1: Failing tests**: `setStatusTag(["smoke","runnable"],"skip")` → `["smoke","skip"]`; adding a custom tag to a list with other customs keeps all of them in order; `addCustomTag` rejects `runnable`, `positive`, `e2e`, `9bad`, `has space` and ignores a duplicate; `removeTag` removes only that tag; `toggleFlaky` twice is identity.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/test-lifecycle.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, types and hooks (mutation invalidates the feature detail like the other scenario mutations).
- [ ] **Step 4: Run** the file and `npx tsc --noEmit` (expect failures only where `ALLOWED_EXTRA_TAGS` is still used; Task 9 removes them).

### Task 9: Scenario tag editor

**Files:**
- Create: `src/components/test-lifecycle/ScenarioTagsEditor.tsx`
- Modify: `src/components/test-lifecycle/ScenarioCard.tsx`, `src/app/(portal)/test-lifecycle/guida/page.tsx`
- Delete: `src/components/test-lifecycle/ExtraTagsPicker.tsx`, `ExtraTagsPicker.test.tsx`
- Test: `src/components/test-lifecycle/ScenarioTagsEditor.test.tsx`, `ScenarioCard.test.tsx`

**Interfaces:**
- Consumes: Task 8 helpers and `useTlCategoryTags()` for suggestions.
- Produces: `ScenarioTagsEditor({ value, readOnly, suggestions, onChange }: { value: string[]; readOnly: boolean; suggestions: readonly string[]; onChange: (tags: string[]) => void })`.

- [ ] **Step 1: Failing tests**: the three groups render ("Stato": a radio group of `@runnable`/`@skip`/`@broken`; "Altri tag": a `@flaky` toggle, custom chips with a remove button and an input with suggestions); choosing a status replaces only the status; typing a custom tag and pressing Enter adds it and keeps the others; removing a custom chip then re-adding it works; typing a reserved name shows the Italian error and adds nothing; read-only disables everything; in `ScenarioCard`, adding a tag to a scenario that has `["smoke","checkout"]` saves `["smoke","checkout",<new>]` (the reported bug), and every tag change triggers the existing save.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the editor (keyboard operable, status shown by text and not by colour only; hub tokens); wire it into `ScenarioCard` replacing the picker and `toggleTag`; add one sentence about the tag standard to the guide page.
- [ ] **Step 4: Run** `pnpm test`, `pnpm lint`, `npx tsc --noEmit`. Expected: green.

### Task 10: Test type in metadata, creation dialog and readiness

**Files:**
- Modify: `src/components/test-lifecycle/FeatureMetaPanel.tsx`, `CreateFeatureDialog.tsx`, `FeatureTable.tsx` only if a column already lists similar metadata (otherwise skip)
- Test: `FeatureMetaPanel.test.tsx`, `CreateFeatureDialog.test.tsx`

**Interfaces:**
- Consumes: Task 8 types; the backend reports the missing test type through the existing submit reasons (no rule duplicated here).

- [ ] **Step 1: Failing tests**: the metadata panel shows a "Test type" select with the three values, saving through the existing feature update; read-only when the feature is not editable; the creation dialog offers the select, defaulting to the type implied by the chosen scope's `repo_folder` when it matches (`src/integration…`, `src/e2e…`, `src/api…`) and sending `test_type` only when chosen or implied.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** both; mirror `default_test_type` as a small helper in `src/lib/test-lifecycle.ts` with its own test.
- [ ] **Step 4: Run** the full frontend checks. Expected: green.

### Task 11: Cleanup notice in the Scenari tab

**Files:**
- Create: `src/components/test-lifecycle/TagCleanupNotice.tsx`
- Modify: the Scenari tab host (the detail page component that lists `ScenarioCard`s)
- Test: `TagCleanupNotice.test.tsx`, the detail page test

**Interfaces:**
- Consumes: `useTlTagCleanup`, `useApplyTlTagCleanup`, `TlTagCleanup`.
- Produces: `TagCleanupNotice({ featureId, editable }: { featureId: string; editable: boolean })`.

- [ ] **Step 1: Failing tests**: renders nothing when `rows` is empty or the feature is not editable; otherwise "N scenari hanno tag di test-type (@e2e…): il test-type appartiene al file" with the proposed type, an "Applica pulizia" button that calls the apply mutation and then hides the notice; with a `conflict` the button is disabled and the conflict text is shown.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the component and mount it above the scenario list.
- [ ] **Step 4: Run** the full frontend checks. Expected: green.

### Task 12: Coloured file preview

**Files:**
- Modify: `src/lib/gherkin-highlight.ts`, `src/components/test-lifecycle/FilePreview.tsx`
- Test: `src/lib/gherkin-highlight.test.ts`, `src/components/test-lifecycle/FilePreview.test.tsx` (new)

**Interfaces:**
- Consumes: `highlightLine(line: string): HighlightSpan[]` (spans always concatenate back to the line).

- [ ] **Step 1: Failing tests**: `highlightLine("Funzionalità: Foo")`, `"  Schema dello scenario: x"`, `"    Esempi:"`, `"Esigenza di Business: x"`, `"Abilità: x"`, `"Regola: x"` mark the keyword span; a tag line (`@POS_006 @integration`) gives tag spans per tag; `# language: it` and `#link:` lines are comments; table rows `| a | b |` are not mangled and concatenate back; in the preview, a tag renders inside a span with the tag class and the copy button still copies the exact plain text.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**: extend the keyword list (longest first) and render each preview line from its spans with the same token classes the steps editor uses, keeping the `<pre aria-label="Anteprima file">` and the plain text copy.
- [ ] **Step 4: Run** the full frontend checks. Expected: green. The person checks the preview in light and dark theme before the PR.
