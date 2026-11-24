# Test Lifecycle Detail Page UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the feature detail page pleasant to write in: visible save state, keyword-highlighted steps, shortcuts, collapsible/reorderable/duplicable scenarios with an index, a readiness checklist, a grouped metadata panel and richer tabs.

**Architecture:** Frontend only. The save state and "unsaved" detection live in `useTlRevisionWriter` / `useDraftSave` (editors register a dirty checker next to their flusher). Highlighting is a coloured mirror layer inside the existing `StepsEditor` line layer, with the textarea text made transparent. Scenario organisation (collapse, move, drag, duplicate, index) lives in `ScenariosTab` (in `src/app/(portal)/test-lifecycle/[id]/page.tsx`) and `ScenarioCard`. Everything reuses existing endpoints.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before writing Next code, per repo `AGENTS.md`), React 19, Tailwind 4, lucide-react, Vitest + Testing Library. pnpm only; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-24-test-lifecycle-detail-ux-design.md`

## Global Constraints

- Frontend only: no backend/API change, no new npm dependency.
- UI copy Italian; code and comments English; colours from hub tokens (`text-accent`, `text-text-muted`, `bg-subtle`, `bg-accent-soft`, `text-danger`, ...), must work in light and dark mode.
- Use shared styles: `PRIMARY_BUTTON_CLASS`, `SECONDARY_BUTTON_CLASS`, `ROW_ICON_CLASS`, `INPUT_CLASS`, `SELECT_CLASS` from `@/components/ui/formStyles`; section/field labels `font-mono text-[11px] uppercase text-text-muted`.
- Never lose typed content; keep the optimistic-lock flow (`stale`, `StaleDraftError`, `afterPendingWrites`) unchanged. Reordering must work without a mouse (move up/down buttons).
- Existing accessible names stay valid where tests use them: button `Rimuovi scenario`, `Salva`, `Commenta`, textarea label `Step`, `Titolo scenario`, `Aggiungi scenario`, input `Titolo nuovo scenario`.
- Shortcuts are ignored when the event target is inside `[role="dialog"]`.
- Base UI tooltips make jsdom tests very slow under full-suite load: do not add tooltip components; use native `title` attributes.
- Run `pnpm test`, `pnpm lint` and `npx tsc --noEmit -p .` before reporting. No commits/pushes by the assistant: each task ends proposing a commit message; the user commits. Work on branch `feature/test-lifecycle-detail-ux` (already created from the delete branch).

## Review Focus

- Typing in a scenario then closing the tab: `beforeunload` must warn (dirty but not yet blurred/saved) and must not warn when everything is saved.
- A failed save shows "Errore di salvataggio" and keeps the typed text; a later successful save clears it.
- Highlight layer and textarea must stay aligned on long lines, empty lines, lines with only a keyword, tabs and lines starting with `@`/`#`.
- Collapsing a card with unsaved text must not drop the draft (collapse, expand: text still there; flush still saves it).
- Duplicate while the source card has unsaved edits copies the current draft, not the last saved one.
- Move up on the first scenario / down on the last are no-ops (buttons disabled); drag onto itself does nothing.
- Ctrl+S inside a dialog textarea (e.g. "Richiedi modifiche") must not trigger a save or add a scenario.
- The side index must not break narrow screens (hidden below `lg`).

---

## File Structure

- Modify `src/lib/test-lifecycle.ts`: `RegisterFlush` type, shared helpers.
- Modify `src/hooks/useDraftSave.ts`, `src/hooks/useTlRevisionWriter.ts` (+ their tests).
- Create `src/hooks/useUnsavedGuard.ts`, `src/components/test-lifecycle/SaveIndicator.tsx`.
- Create `src/lib/gherkin-highlight.ts`; modify `StepsEditor.tsx`.
- Create `src/lib/shortcuts.ts`, `src/components/test-lifecycle/ShortcutHint.tsx`.
- Modify `ScenarioCard.tsx`, `FeatureHeader.tsx`, `FeatureMetaPanel.tsx`, `BackgroundEditor.tsx`, `[id]/page.tsx`.
- Create `src/components/test-lifecycle/ReadinessChecklist.tsx`, `ScenarioIndex.tsx`.

### Task 1: Save state and unsaved guard

**Files:**
- Modify: `src/lib/test-lifecycle.ts`, `src/hooks/useDraftSave.ts`, `src/hooks/useTlRevisionWriter.ts`, `src/components/test-lifecycle/ScenarioCard.tsx`, `BackgroundEditor.tsx`, `FeatureMetaPanel.tsx` (only their `registerFlush` prop types), `FeatureHeader.tsx`, `src/app/(portal)/test-lifecycle/[id]/page.tsx`
- Create: `src/hooks/useUnsavedGuard.ts`, `src/components/test-lifecycle/SaveIndicator.tsx`
- Test: `src/hooks/useTlRevisionWriter.test.ts`, `src/hooks/useDraftSave.test.ts` (create if absent), `src/components/test-lifecycle/SaveIndicator.test.tsx`, `src/hooks/useUnsavedGuard.test.ts`, `FeatureHeader.test.tsx`

**Interfaces:**
- Produces in `src/lib/test-lifecycle.ts`: `export type RegisterFlush = (fn: Flusher, isDirty?: () => boolean) => () => void;` and `export interface TlSaveState { phase: "idle" | "saving" | "error"; savedAt: number | null; error: string | null }`.
- `useDraftSave` option `registerFlush?: RegisterFlush`; it registers `() => saveRef.current()` together with a dirty checker returning true when `diff(saved, draft)` has keys or a save is in flight.
- `useTlRevisionWriter` additionally returns `saveState: TlSaveState` (phase `saving` while any queued write runs, `error` after a non-stale failure until the next success, `savedAt` = `Date.now()` of the last success), `hasUnsaved(): boolean` (pending writes, an error, or any registered dirty checker true), `saveAll(): Promise<boolean>` (runs every registered flusher, true when none failed), and `registerFlush: RegisterFlush`.
- `export function useUnsavedGuard(hasUnsaved: () => boolean): void` adds a `beforeunload` listener (removed on unmount) that calls `preventDefault()` and sets `returnValue = ""` only when `hasUnsaved()` is true at event time.
- `SaveIndicator({ state }: { state: TlSaveState })` renders `<span role="status" aria-live="polite">`: `Salvataggio…`, `Errore di salvataggio` (danger colour, `title` = error), `Salvato alle HH:MM` (it-IT 24h time), or nothing when idle and never saved.
- `FeatureHeader` gains optional prop `saveState?: TlSaveState` rendering `SaveIndicator` in the action row; `[id]/page.tsx` passes `writer.saveState` and calls `useUnsavedGuard(writer.hasUnsaved)`.

- [ ] **Step 1: Write failing tests**: `useDraftSave registers a dirty checker that is true only while the draft differs or a save is running`; `writer.saveState goes saving then idle with savedAt after a write`; `writer.saveState is error after a failed write and clears after the next success`; `writer.hasUnsaved is true with a dirty checker registered and false after it reports clean`; `writer.saveAll resolves false when a flusher fails`; `useUnsavedGuard prevents unload only when hasUnsaved returns true`; `SaveIndicator renders saving, error and saved texts`; `FeatureHeader renders the save indicator when saveState is given`.
- [ ] **Step 2: Run** `pnpm vitest run src/hooks src/components/test-lifecycle/SaveIndicator.test.tsx src/components/test-lifecycle/FeatureHeader.test.tsx`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** the interfaces above. Stale-lock rejections do not set `error`. Replace the three components' `registerFlush?: (fn: Flusher) => () => void` prop types with `RegisterFlush`.
- [ ] **Step 4: Run** the same command plus `pnpm vitest run "src/app/(portal)/test-lifecycle"`. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): show save state and warn about unsaved changes`.

### Task 2: Gherkin keyword highlighting

**Files:**
- Create: `src/lib/gherkin-highlight.ts`
- Modify: `src/components/test-lifecycle/StepsEditor.tsx`
- Test: `src/lib/gherkin-highlight.test.ts`, `src/components/test-lifecycle/StepsEditor.test.tsx`, `StepsEditorAutocomplete.test.tsx` (must still pass)

**Interfaces:**
- Produces: `export type HighlightKind = "keyword" | "tag" | "comment" | "text"`; `export interface HighlightSpan { text: string; kind: HighlightKind }`; `export function highlightLine(line: string): HighlightSpan[]` — concatenating every span's `text` always equals `line` exactly. Rules: a line whose first non-space character is `#` is one `comment` span; otherwise a leading keyword (after optional spaces, case-sensitive, followed by a space or end of line; longest match first) from `Dato che, Dato, Quando, Allora, E, Ma, Given, When, Then, And, But, Scenario, Contesto, Esempi, Examples, Background` is a `keyword` span and the rest is `text`; tokens starting with `@` inside the text are `tag` spans.
- `StepsEditor`: inside the existing absolute per-line layer, render each line's spans coloured by kind (`keyword` → `var(--accent)`, `tag` → `var(--info)`, `comment` → `var(--text-muted)`, `text` → `var(--text)`) with the same `px-2 whitespace-pre font-mono` metrics as the textarea; the textarea gets `text-transparent` and `caret-[var(--text)]` classes (selection stays visible). No font-weight changes (alignment). Empty lines render a zero-width space-free empty div of height 20.

- [ ] **Step 1: Write failing tests**: `highlightLine splits a keyword from the rest of the step` (`"Quando L'utente clicca"` → keyword `Quando`, text ` L'utente clicca`); `highlightLine matches Dato che before Dato`; `highlightLine does not treat a word starting with E as the keyword E` (`"Elenco"` → single text span); `highlightLine keeps leading spaces and returns spans that rebuild the line` (property check over several lines); `highlightLine marks a # line as comment`; `highlightLine marks @tags`; `StepsEditor colours the keyword of each line` (query the mirror line, assert its keyword span has the accent colour style and the textarea value is unchanged); `StepsEditor keeps error lines highlighted`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/gherkin-highlight.test.ts src/components/test-lifecycle/StepsEditor.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per the interface. Existing tests that read text via `getByText` may now find the mirror too: scope them to the textarea (`getByLabelText("Step")`) rather than loosening the mirror.
- [ ] **Step 4: Run** `pnpm vitest run src/lib src/components/test-lifecycle`. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): highlight Gherkin keywords in the steps editor`.

### Task 3: Save and add-scenario shortcuts

**Files:**
- Create: `src/lib/shortcuts.ts`, `src/components/test-lifecycle/ShortcutHint.tsx`
- Modify: `src/app/(portal)/test-lifecycle/[id]/page.tsx` (page root and `ScenariosTab`)
- Test: `src/lib/shortcuts.test.ts`, `ShortcutHint.test.tsx`, `[id]/page.test.tsx`

**Interfaces:**
- Produces: `export type ShortcutAction = "save" | "add" | "duplicate"`; `export function matchShortcut(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; target: EventTarget | null }): ShortcutAction | null` — `save` = Ctrl/Cmd+S (no shift), `add` = Ctrl/Cmd+Enter, `duplicate` = Ctrl/Cmd+Shift+D (key `d` or `D`); returns null when the target is an Element inside `[role="dialog"]`.
- `ShortcutHint()` renders one muted mono line: `Ctrl+S salva · Ctrl+Invio aggiungi scenario · Ctrl+Maiusc+D duplica`.
- Page root `div` gets `onKeyDown`: on `save` call `preventDefault()` then `void writer.saveAll()`. `ScenariosTab` wrapper `onKeyDown`: on `add`, `preventDefault()`; if the new-title input has text call its existing `add()`, else focus the input.

- [ ] **Step 1: Write failing tests**: `matchShortcut recognises save, add and duplicate with ctrl or meta`; `matchShortcut ignores plain keys and shift+s`; `matchShortcut returns null inside a dialog`; `Ctrl+S in the detail page flushes pending edits and prevents the browser dialog`; `Ctrl+Enter focuses the new scenario title when empty and adds the scenario when filled`; `ShortcutHint lists the three shortcuts`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/shortcuts.test.ts "src/app/(portal)/test-lifecycle/[id]/page.test.tsx"`. Expected: FAIL.
- [ ] **Step 3: Implement** per the interface; render `ShortcutHint` under the scenarios toolbar area (top of `ScenariosTab`) when `editable`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): add save and add-scenario keyboard shortcuts`.

### Task 4: Scenario card header (collapse, icons, duplicate and move hooks)

**Files:**
- Modify: `src/components/test-lifecycle/ScenarioCard.tsx`
- Test: `src/components/test-lifecycle/ScenarioCard.test.tsx`

**Interfaces:**
- Produces: `export interface ScenarioCopy { title: string; kind: TlScenarioKind; polarity: TlPolarity; extra_tags: string[]; steps: string; examples: TlExamples | null; detail_link: string }` and new optional `ScenarioCard` props: `collapsed?: boolean`, `onToggleCollapsed?: () => void`, `onDuplicate?: (copy: ScenarioCopy) => Promise<unknown> | void` (called with the CURRENT draft), `onMove?: (direction: "up" | "down") => void`, `canMoveUp?: boolean`, `canMoveDown?: boolean`, `dragHandleProps?: React.HTMLAttributes<HTMLButtonElement> & { draggable?: boolean }`.
- Card root `<article>` gets `id={"scenario-" + scenario.id}` and `data-scenario-id={scenario.id}`.
- Header (always visible): chevron button (`aria-expanded`, `aria-label` `Comprimi scenario #n` / `Espandi scenario #n`), `#n`, tag chip, `@polarity`, the current title (truncated, visible when collapsed), error badge (`aria-label` `N errori`) when live errors exist, comment icon button (`aria-label` `Commenta`, with the existing open-comments badge), then, when not read-only, icon buttons (`ROW_ICON_CLASS`, lucide `size={16}`): drag handle (`GripVertical`, `aria-label` `Trascina scenario`), move up/down (`aria-label` `Sposta scenario in alto` / `in basso`, disabled per `canMoveUp/Down`), duplicate (`aria-label` `Duplica scenario`), delete (`aria-label` `Rimuovi scenario`, same confirm flow as today but inline in the header: `Conferma rimozione` / `Annulla`). `Ctrl/Cmd+Shift+D` inside the card (via `matchShortcut` from Task 3 on the article `onKeyDown`) calls `onDuplicate`.
- When `collapsed`, only the header renders (the draft stays in the card hook, so text is never lost); the footer keeps only `Salva` when expanded.

- [ ] **Step 1: Write failing tests**: `collapsed card shows the title and tag but not the steps editor`; `collapse then expand keeps unsaved text`; `error badge shows the number of live errors`; `duplicate sends the current draft, not the saved scenario` (type new steps, click `Duplica scenario`, assert the callback arg `steps`); `Ctrl+Shift+D calls onDuplicate`; `move buttons call onMove and are disabled at the edges`; `read-only card hides the action icons`; `delete still needs confirmation`; existing tests keep passing.
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/ScenarioCard.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per the interface. Use native `title` for icon hints (no tooltip component).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): collapsible scenario cards with action icons`.

### Task 5: Scenarios tab (collapse all, duplicate, reorder, drag, index)

**Files:**
- Modify: `src/app/(portal)/test-lifecycle/[id]/page.tsx` (`ScenariosTab`)
- Create: `src/components/test-lifecycle/ScenarioIndex.tsx`
- Test: `src/components/test-lifecycle/ScenarioIndex.test.tsx`, `[id]/page.test.tsx`

**Interfaces:**
- Consumes: Task 4 card props, `writer.addScenario(data: TlScenarioCreate)` and `writer.updateScenario(id, patch)` (patch accepts `position`).
- Produces: `ScenarioIndex({ items, onSelect }: { items: { id: string; number: number; title: string; errors: number }[]; onSelect: (id: string) => void })` rendering `<nav aria-label="Indice scenari">` with one button per scenario (`#n title`, red dot when `errors > 0`).
- `ScenariosTab`: keeps `collapsed: Record<string, boolean>`; toolbar buttons `Comprimi tutti` / `Espandi tutti` (`SECONDARY_BUTTON_CLASS`); `duplicate(copy)` = `writer.addScenario({ title: copy.title + " (copia)", kind: copy.kind, polarity: copy.polarity })` then `writer.updateScenario(created.id, { extra_tags, steps, examples, detail_link: copy.detail_link.trim() || null })`; `move(id, "up" | "down")` = `writer.updateScenario(id, { position: neighbour.position })`; drag and drop: the handle sets `dataTransfer` to the scenario id, a drop on another card calls `writer.updateScenario(sourceId, { position: target.position })` (dropping on itself does nothing); selecting an index item expands that card if collapsed and calls `scrollIntoView` on `#scenario-<id>`; layout `lg:grid lg:grid-cols-[minmax(0,1fr)_220px]` with the index `sticky top-4 hidden lg:block`.
- Existing behaviour preserved: add-scenario input, stale handling, comment jump.

- [ ] **Step 1: Write failing tests**: `ScenarioIndex lists scenarios and reports the selected id`; `ScenarioIndex marks scenarios with errors`; `Comprimi tutti collapses every card and Espandi tutti restores them`; `duplicate creates a copy titled "<title> (copia)" then copies steps and tags` (assert `addScenario` then `updateScenario` calls and their args); `move down sends the next scenario position`; `first scenario cannot move up and last cannot move down`; `dropping a card on another sends the target position`; `dropping a card on itself sends nothing`; `selecting an index item expands a collapsed card`.
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/ScenarioIndex.test.tsx "src/app/(portal)/test-lifecycle/[id]/page.test.tsx"`. Expected: FAIL.
- [ ] **Step 3: Implement** per the interface. jsdom has no `scrollIntoView`: guard the call (`el.scrollIntoView?.(...)`).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): scenario index, reorder and duplicate`.

### Task 6: Readiness checklist

**Files:**
- Create: `src/components/test-lifecycle/ReadinessChecklist.tsx`
- Modify: `src/components/test-lifecycle/FeatureHeader.tsx` (replace the current "non disponibile" bullet list)
- Test: `ReadinessChecklist.test.tsx`, `FeatureHeader.test.tsx`

**Interfaces:**
- Produces: `ReadinessChecklist({ title, reasons }: { title: string; reasons: string[] })`: with reasons, a bordered `bg-subtle` box with the mono label `title` (`Prima di inviare in review` / `Prima di approvare`) and one item per reason with an `X` icon in `text-danger` plus a counter `N da risolvere`; with no reasons and an allowed primary action it shows a single success item `Pronta per l'invio in review` / `Pronta per l'approvazione` (`Check` icon, `text-success`).
- `FeatureHeader` renders it in the same place and under the same conditions as today's list (primary action per revision status); the text of each reason must stay in the DOM so the existing assertions (`Nessuno scenario`) still pass.

- [ ] **Step 1: Write failing tests**: `lists each reason with a counter`; `shows the ready state when there are no reasons`; `uses the approval wording in review`; `FeatureHeader still exposes the reasons received`.
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/ReadinessChecklist.test.tsx src/components/test-lifecycle/FeatureHeader.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per the interface (no frontend-invented rules: only backend reasons).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): readiness checklist before review`.

### Task 7: Metadata panel sections

**Files:**
- Modify: `src/components/test-lifecycle/FeatureMetaPanel.tsx`
- Test: `src/components/test-lifecycle/FeatureMetaPanel.test.tsx`

**Interfaces:**
- Consumes: `feature.jira: TlJiraLink[]` (role, key, status, category, url), `JIRA_CATEGORY_COLOR`/`JIRA_CATEGORY_LABEL` from `@/lib/test-lifecycle`.
- Layout: keep every existing field, label text and save behaviour; group into four sections, each with a mono title (`font-mono text-[11px] uppercase text-text-muted` plus a top rule): `Generale` (Titolo, Descrizione), `Persone` (Owner design, Reviewer, Owner implementazione), `Jira` (Jira progettazione, Jira implementazione, Epic QA…), `Prodotto e stime` (Epic/Story prodotto + reverse engineering checkbox, Requisiti, the two estimates). Fields in a section share one grid (`sm:grid-cols-2`, persons `sm:grid-cols-3`), the reverse-engineering checkbox aligned with its input row. Under each Jira input whose key matches a link in `feature.jira`, show a chip with the Jira status (category colour) and an external link to `url` when `safeHttpUrl` accepts it. The Epic QA label gets a `title` attribute explaining that it overrides the scope's epic.

- [ ] **Step 1: Write failing tests**: `renders the four section titles`; `shows the Jira status chip and link under a linked key`; `shows no chip for an unlinked key`; `Epic QA field explains the override via title`; all existing FeatureMetaPanel tests keep passing.
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/FeatureMetaPanel.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per the layout.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): group the metadata panel into sections`.

### Task 8: Tabs with icons and counters, final verification

**Files:**
- Modify: `src/app/(portal)/test-lifecycle/[id]/page.tsx` (tab declarations and rendering), `src/components/ui/tabs.tsx` only if the active-state style needs a variant class
- Test: `[id]/page.test.tsx`

**Interfaces:**
- Tab `label` becomes a ReactNode: lucide icon (`ListChecks` Scenari, `MessageSquare` Review, `History` Storico, `GitBranch` Git, `Link2` Jira, `Activity` NRT, `FileText` Anteprima file; `size={14}`, `aria-hidden`) + text + optional counter chip (`font-mono text-[11px]`, `bg-neutral-soft`): Scenari = number of scenarios of the revision, Review = unresolved comments (hidden when 0), Git keeps `feature.open_issues`, Jira keeps the `(!)` error mark. Accessible tab names stay `Scenari`, `Review`, `Storico`, `Git`, `Jira`, `NRT`, `Anteprima file` with the count appended only when non-zero (e.g. `Scenari 3`); update existing tab queries accordingly. Active tab gets a clear style (accent text and `bg-surface` with shadow).

- [ ] **Step 1: Write failing tests**: `tabs show the scenario count and unresolved comment count`; `Review tab hides the counter at zero`; `tabs keep working by role and name` (switch to Review and Storico).
- [ ] **Step 2: Run** `pnpm vitest run "src/app/(portal)/test-lifecycle/[id]/page.test.tsx"`. Expected: FAIL.
- [ ] **Step 3: Implement** per the interface.
- [ ] **Step 4: Run** `pnpm test`, `pnpm lint`, `npx tsc --noEmit -p .`. Expected: all green (run the suite twice; investigate any jsdom timeout instead of raising timeouts).
- [ ] **Step 5:** propose commit `feat(test-lifecycle): richer detail tabs`; then manually check the detail page in the browser (light and dark, narrow width) and report what was and was not verified.
