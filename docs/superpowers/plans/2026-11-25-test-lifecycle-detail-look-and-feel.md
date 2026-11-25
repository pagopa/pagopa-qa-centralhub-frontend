# Test Lifecycle detail page look and feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the feature detail page a progress strip, compact collapsible metadata, scenario cards with identity (polarity bar, segmented controls, tinted header) and a calmer rhythm, inside the portal style.

**Architecture:** New small presentational pieces (`LifecycleProgress`, `SegmentedControl`, `PersonChip`) plus restyling of `FeatureMetaPanel`, `ScenarioCard`, `ExtraTagsPicker` and the tab bar. No change to data flow, saving or locking. Colours come from existing hub tokens (`--area-violet`, `--success`, `--danger`, `-soft` pairs).

**Tech Stack:** Next.js 16, React 19, Tailwind 4, @base-ui/react tabs, lucide-react, Vitest + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-25-test-lifecycle-detail-look-and-feel-design.md`

## Global Constraints

- Work in `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-frontend` on branch `feature/test-lifecycle-detail-look` cut from an up-to-date `main` (`git checkout main && git pull --ff-only`); the highlight fix branch must already be committed by the user. Never commit, push or open PRs.
- Read `node_modules/next/dist/docs/` before Next-specific code. UI copy Italian; code, comments and docs English.
- Hub tokens only (`var(--...)`, Tailwind token classes); no raw hex in components. No new dependency, no backend change.
- Text contrast at least 4.5:1 and icon/marker contrast at least 3:1 in light and dark; polarity and status always also written as text.
- Behaviour must not change: field saving (`useDraftSave`, `useTlRevisionWriter`), flush/dirty registration, shortcuts, autocomplete, drag and drop, permissions, read-only rules. Existing tests keep passing; tests that must change are only the ones tied to markup replaced here.
- Base UI tooltips make jsdom tests slow under full-suite load: do not add tooltips to tested components; use `title`.
- Run `pnpm vitest run <path>` per step, and the full `pnpm test`, `pnpm lint` and `npx tsc --noEmit` at the end of each task.

## Review Focus

- Collapsed metadata panel: the panel must stay mounted (hidden, not unmounted) so its flush/dirty registration, the Jira-key flusher and the unsaved-changes guard keep working; a missing title must still be flagged when collapsed.
- Read-only and stale states: segmented controls are disabled when `readOnly` or `stale` and render as plain chips when `readOnly`; no editable-looking control when nothing can be edited.
- Revision with no data: feature with no revision, no title, no owners, very long titles/user names: no overflow, no crash.
- Progress strip on a narrow screen and for every status combination (draft, in_review, designed/approved, implemented, running, reopened draft of an implemented feature).
- Dark theme: polarity bar, tinted headers and pills keep the contrast targets.

---

### Task 1: Lifecycle progress strip

**Files:**
- Create: `src/components/test-lifecycle/LifecycleProgress.tsx`
- Create: `src/components/test-lifecycle/LifecycleProgress.test.tsx`
- Modify: `src/app/(portal)/test-lifecycle/[id]/page.tsx` (render it under `FeatureHeader`)

**Interfaces:**
- Produces:
  - `progressSteps(feature: Pick<TlFeatureDetail, "status" | "working_revision" | "published_revision">): { label: string; state: "done" | "current" | "upcoming" }[]` — four steps `Bozza`, `In review`, `Progettata`, `Implementata`; the current step comes from the current revision (`working_revision ?? published_revision`): `draft` 0, `in_review` 1, `approved` 2, `merged` 3 (`superseded` counts as 3); no revision means step 0; when `feature.status === "running"` the fourth label is `In esecuzione` and it is current.
  - `LifecycleProgress({ feature })` renders an ordered list (`<ol aria-label="Avanzamento della feature">`), the current item with `aria-current="step"`, done items with a check icon and sr-only text "completato".

- [ ] **Step 1: Write failing tests** in `LifecycleProgress.test.tsx`:
  - `marks Bozza as current for a draft revision` (steps `[current, upcoming, upcoming, upcoming]`).
  - `marks In review as current and Bozza as done` for `in_review`.
  - `marks Progettata as current for an approved revision`.
  - `marks Implementata as current for a merged revision` and for `superseded`.
  - `shows a reopened draft of an implemented feature as Bozza` (`status: "implemented"`, working revision `draft`, published `merged`): Bozza current.
  - `reads In esecuzione when the feature is running`.
  - `has Bozza current when the feature has no revision`.
  - `exposes the current step to assistive technology`: one element with `aria-current="step"`; done items contain "completato".
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/LifecycleProgress.test.tsx` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement `progressSteps` and `LifecycleProgress`.** Horizontal list with connector lines; current step filled with `var(--area-violet)` and `var(--area-violet-soft)` background, done steps check icon in `var(--success)`, upcoming muted; wraps or scrolls horizontally on narrow screens without overflowing the page.
- [ ] **Step 4: Render it in `page.tsx`** right under `FeatureHeader`, no props other than `feature`.
- [ ] **Step 5: Run** `pnpm vitest run src/components/test-lifecycle src/app` then `npx tsc --noEmit` — Expected: PASS.

### Task 2: Compact, collapsible metadata panel

**Files:**
- Create: `src/lib/initials.ts` (+ `src/lib/initials.test.ts`)
- Create: `src/components/test-lifecycle/PersonChip.tsx` (+ test)
- Modify: `src/components/test-lifecycle/FeatureMetaPanel.tsx`
- Test: `src/components/test-lifecycle/FeatureMetaPanel.test.tsx`

**Interfaces:**
- Produces:
  - `initials(name: string): string` — up to two uppercase letters (first letter of the first and last word); empty or blank gives `"?"`.
  - `PersonChip({ name, label }: { name: string; label?: string })` — circle with initials plus the name (truncating), `label` as visually hidden prefix.
  - `FeatureMetaPanel` keeps its props; adds a collapse toggle (button `aria-expanded`, name "Metadati") stored with `useStoredFlag("qa-hub-tl-meta-open", true)`.

- [ ] **Step 1: Write failing tests**
  - `initials.test.ts`: "Annalisa Sabatelli" → "AS"; "marco" → "M"; "  " → "?"; "Mario Rossi Bianchi" → "MB"; accents kept ("Élodie Dupont" → "ÉD").
  - `PersonChip.test.tsx`: shows initials and name; sr-only label present when given.
  - `FeatureMetaPanel.test.tsx`: `shows people as chips when read-only` (name visible, no combobox, initials visible); `collapses to a summary with owners and Jira keys` (click "Metadati": inputs hidden, summary shows owner names and Jira keys); `keeps the fields mounted while collapsed` (the title input still exists in the DOM, hidden, so flush registration is unaffected: assert `registerFlush` is still registered/unregistered only on unmount using the existing mock pattern in the file); `remembers the collapsed state` (stub localStorage, remount); `flags a missing title even when collapsed` (empty title in edit mode → alert text `TITLE_REQUIRED` visible in the summary).
- [ ] **Step 2: Run** the three test files — Expected: new tests FAIL, existing PASS.
- [ ] **Step 3: Implement `initials` and `PersonChip`; restyle `FeatureMetaPanel`:** panel header with chevron toggle and the summary line when collapsed; content wrapper hidden with the `hidden` attribute (not conditional rendering); layout: title and description full width; people in three columns (read-only as `PersonChip`, editable keep the `<select>` with the initials circle before it); Jira keys in three columns with `JiraChip` under each; product, reverse-engineering toggle, requirements and the two estimates in a compact multi-column grid; field labels in mono uppercase with `text-dim`; section titles with a small `var(--area-violet)` marker; card class from Task 4 (use the existing classes until then).
- [ ] **Step 4: Run** `pnpm vitest run src/components/test-lifecycle src/lib` and `npx tsc --noEmit` — Expected: PASS (all existing panel tests included).

### Task 3: Scenario card identity and segmented controls

**Files:**
- Create: `src/components/ui/SegmentedControl.tsx` (+ `SegmentedControl.test.tsx`)
- Modify: `src/components/test-lifecycle/ScenarioCard.tsx`, `src/components/test-lifecycle/ExtraTagsPicker.tsx`
- Test: `src/components/test-lifecycle/ScenarioCard.test.tsx`, `src/components/test-lifecycle/ExtraTagsPicker.test.tsx`

**Interfaces:**
- Produces: `SegmentedControl<T extends string>(props: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; disabled?: boolean; readOnly?: boolean })` — a `role="radiogroup"` named by `label`, native radio inputs, arrow keys move the selection; `readOnly` renders only the selected option as a chip (no radios); `disabled` disables the radios.
- `ScenarioCard`: root `article` gets `data-polarity` (`positivo`/`negativo`); a 4px left bar coloured `var(--success)` or `var(--danger)`; header with `var(--subtle)` background; the scenario tag pill in `var(--area-violet-soft)` / `var(--area-violet)`; polarity written in the header as "Positivo"/"Negativo" text; hover raises the shadow. Tipo and Polarità use `SegmentedControl` (options `Scenario`/`Schema dello scenario`, `Positivo`/`Negativo`); behaviour of the old selects is preserved (kind change validates and saves and creates empty examples for an outline; polarity change saves).

- [ ] **Step 1: Write failing tests**
  - `SegmentedControl.test.tsx`: renders a radiogroup named by `label` with the selected option checked; clicking another option calls `onChange` with its value; ArrowRight/ArrowLeft move the selection and call `onChange`; `disabled` disables every radio; `readOnly` renders the selected label as text without radios.
  - `ScenarioCard.test.tsx`: `marks the card with its polarity` (`data-polarity`); `shows the polarity as text` ("Positivo" visible); `changes polarity from the segmented control and saves` (choose "Negativo" → `onSave` called with `polarity: "negativo"`, same as the old select test if present); `switching Tipo to the outline shows the examples grid and saves`; `renders plain chips and no radios when read-only`; `disables the controls when the draft is stale`.
  - `ExtraTagsPicker.test.tsx`: active tags carry `aria-checked`/checked state and a filled style (`data-active="true"` on the label), inactive ones `data-active="false"`.
- [ ] **Step 2: Run** the three files — Expected: new tests FAIL.
- [ ] **Step 3: Implement `SegmentedControl`** (visually hidden native radios, pill labels with `has-[:checked]` styling, focus ring via `has-[:focus-visible]`), then update `ScenarioCard` and `ExtraTagsPicker`; keep every existing `aria-label`, `title`, `data-testid` and the collapse/move/duplicate/drag behaviour.
- [ ] **Step 4: Run** `pnpm vitest run src/components` and `npx tsc --noEmit` — Expected: PASS.

### Task 4: Page rhythm: cards and tabs

**Files:**
- Modify: `src/components/ui/formStyles.ts` (new `CARD_CLASS`), `src/components/test-lifecycle/FeatureMetaPanel.tsx`, `src/components/test-lifecycle/ScenarioCard.tsx`, `src/app/(portal)/test-lifecycle/[id]/page.tsx`
- Test: `src/app/(portal)/test-lifecycle/[id]/page.test.tsx`

**Interfaces:**
- Produces: `CARD_CLASS` string (rounded `var(--radius)`, `border-border`, `bg-surface`, `shadow-[var(--shadow-sm)]`); the tab list uses `variant="line"` with the active trigger text and underline in `var(--area-violet)`; the existing counters and alert markers stay.

- [ ] **Step 1: Write failing tests** in the page test: `uses the line tab bar and keeps every tab reachable` (tabs still selectable by role `tab`, counters and sr-only texts unchanged); `renders the progress strip under the header` (list "Avanzamento della feature" present).
- [ ] **Step 2: Run** `pnpm vitest run "src/app/(portal)/test-lifecycle/[id]"` — Expected: the strip test passes if Task 1 is done, the tab test FAILS only if it asserts the new variant attribute (`data-variant="line"`).
- [ ] **Step 3: Implement** `CARD_CLASS`, use it in the metadata panel and scenario cards, switch the tab list to the line variant and override the underline colour with `var(--area-violet)`; tidy spacing between blocks (`gap-5` rhythm) without changing the DOM order.
- [ ] **Step 4: Contrast check** of the new colour pairs in both themes (script or devtools): `--success`/`--danger` bars against `--surface` (at least 3:1), text on `--area-violet-soft`, `--success-soft`, `--danger-soft` and `--subtle` (at least 4.5:1); adjust the choice of token (not new colours) if one fails and note the values checked.
- [ ] **Step 5: Run** `pnpm vitest run` for the touched folders and `npx tsc --noEmit` — Expected: PASS.

### Task 5: Verification and hand-off

- [ ] **Step 1: Run** `pnpm test`, `pnpm lint`, `npx tsc --noEmit` — Expected: all green, lint 0 errors (the 3 known warnings may remain), test count at least the previous count plus the new tests.
- [ ] **Step 2: Visual check is the person's** (no real backend here): list what to look at in the hand-off — light and dark themes; narrow and wide viewport; progress strip for each status; collapsed and expanded metadata; read-only versus editable revision; scenario polarity bars, segmented controls and tag pills; tab underline.
- [ ] **Step 3: Summarise for the PR** (title, description with what was tested, what was not verified visually, the follow-up "two-column layout"). Do not commit or push.
