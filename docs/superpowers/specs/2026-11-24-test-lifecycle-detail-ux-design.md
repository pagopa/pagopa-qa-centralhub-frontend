# Test Lifecycle: feature detail page UX improvements

Date: 2026-11-24
Repo: `pagopa-qa-centralhub-frontend` only (no backend change, no new dependency)
Size: project (three packages, delivered in one branch, in this order).

## Intent and why

The people who write scenarios in the feature detail page (`src/app/(portal)/test-lifecycle/[id]/`)
spend their time typing Gherkin and filling metadata. The page should make that pleasant:
clear save state, a better editor, easy navigation across many scenarios, and a calmer visual
structure in the same style as the NRT section (mono labels, shared button classes, row icons).

## Goals

Package 1 — writing without friction
1. Visible save state in the header ("Salvato alle HH:MM", "Salvataggio…", "Errore, riprova") and a
   `beforeunload` warning while a save is pending or failed.
2. Steps editor: keyword highlighting (Dato/Quando/Allora/E/Ma and Given/When/Then/And/But,
   plus Scenario/Contesto/Esempi where they appear). Autocomplete and error-line highlighting
   already exist in `StepsEditor` and stay as they are.
3. Keyboard shortcuts: Ctrl/Cmd+S flushes the pending save; Ctrl/Cmd+Enter adds a scenario
   (new-scenario title field); Ctrl/Cmd+Shift+D duplicates the focused scenario. A small hint line
   lists them.

Package 2 — orientation
4. Collapsible scenario cards (title, tag, polarity and error badge stay visible), "Comprimi tutti /
   Espandi tutti", and a sticky side index with jump-to-scenario on wide screens.
5. Card actions as icons (duplicate, move up/down, delete, comment with open-comment counter) using
   `ROW_ICON_CLASS`; reordering also by drag handle (HTML5 drag and drop).
6. Readiness checklist near the header for "Invia in review" (title, at least one scenario, reviewer,
   Jira links as applicable), derived from the existing `transitions` reasons and the revision data.

Package 3 — visual polish
7. Metadata panel grouped into sections (Persone, Jira, Prodotto, Stime) with mono section titles,
   aligned grid, tooltip on "Epic QA (sovrascrive quella dell'Ambito)", Jira keys with status/link
   inline like `JiraIssueField` in NRT.
8. Tabs with icons and counters (Scenari n, Review open comments, Jira, NRT) and a clear active state.

## Non-goals

Side-by-side live Gherkin preview; line-by-line diff in the history; any backend or API change; any
new npm dependency; changing validation rules or the save/lock protocol.

## Anti-goals

Losing typed content, double saves, or breaking the optimistic-lock flow (`useTlRevisionWriter`,
stale-lock banner); keyboard shortcuts that fire while the user is typing in an unrelated page area;
reordering that cannot be done without a mouse.

## Decisions and my calls (to be confirmed by reading this doc)

- **Frontend only.** Duplicate scenario = create a scenario (existing add endpoint) then copy title,
  tags, polarity and steps through the existing update endpoint; title gets the suffix " (copia)".
  Reorder uses the existing scenario `position` update.
- **No new dependency.** Keyword highlighting is a mirrored, non-interactive layer behind the textarea
  (transparent text on the textarea), keeping today's "textarea grows, no wrap" alignment approach.
  A code-editor library (CodeMirror/Monaco) was considered and rejected: heavier, new dependency, and
  it would replace the existing autocomplete/error-gutter code. Trade-off: less feature-rich editor.
- **Auto-indent dropped.** Steps in this product are not indented, so it would add nothing.
- **Save state source:** derived from `useTlRevisionWriter` (pending/error/last success time); the
  builder reads that hook and exposes a small status value rather than adding global state.
- **Shortcuts scope:** only active inside the detail page's editable areas; `Ctrl/Cmd+S` calls
  `preventDefault` to avoid the browser save dialog.
- **Readiness checklist** reuses the backend's transition reasons; no frontend-only rules are invented.
- Copy stays Italian; colours from hub tokens, light and dark.

## Approaches considered

Editor: (A) mirrored highlight layer over the existing textarea — chosen; (B) CodeMirror — rejected
(see above); (C) no highlighting, only shortcuts — rejected because highlighting is the most visible
gain for writers.
Reorder: (A) drag handle plus up/down buttons — chosen (keyboard accessible); (B) drag only — rejected
(not accessible).

## Constraints

Read `node_modules/next/dist/docs/` before Next code (repo AGENTS.md); pnpm; `pnpm test` and
`pnpm lint` green; tests co-located; use `src/test/popover-mock.tsx` for Base UI popovers; beware that
Base UI tooltips make jsdom tests slow under full-suite load (render components with tooltips only
when needed). No commits/PRs by the assistant.

## Left to the builder

Exact icons, spacing, copy, the keyword list per language, how the side index collapses on narrow
screens, test layout, and how the writer hook exposes its status.

## Delivery

Built on top of the delete/restyle work. Because that work is uncommitted, the user commits it first;
this work then goes on a new branch cut from it (`feature/test-lifecycle-detail-ux`), as a stacked PR.
