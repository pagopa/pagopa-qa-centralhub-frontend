# Test Lifecycle Delete and Restyle (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delete for scopes and features with a Jira-aware confirmation dialog, and restyle the Test Lifecycle list page and feature detail header like the NRT section.

**Architecture:** Typed hooks wrap the new backend endpoints; one shared `TlDeleteDialog` serves both scopes and features (preview → checklist of Jira issues → delete → per-key result). The NRT row-icon class moves to `formStyles.ts` and is reused by the Test Lifecycle tables. Restyle is class-level only (no behaviour change besides the new actions).

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before writing Next code, per repo `AGENTS.md`), React 19, Tailwind 4, `@base-ui/react` dialogs (`@/components/ui/dialog`), TanStack Query, lucide-react, Vitest + Testing Library. pnpm only.

**Spec:** `docs/superpowers/specs/2026-11-24-test-lifecycle-delete-and-restyle-design.md`. Backend plan (implement first): `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-backend/docs/superpowers/plans/2026-11-24-test-lifecycle-delete.md`.

## Global Constraints

- UI copy in Italian; code, comments in English. Colours only from hub tokens (`text-danger`, `bg-subtle`, ...); must work in light and dark.
- Delete is offered only behind `Gate`: scope delete `manage:tl_scopes`, feature delete `edit:tl_feature`.
- Jira checklist preselection: roles `design` and `impl` checked, `qa_epic` unchecked (use each issue's `default_selected`). Deleting with nothing checked is allowed and leaves Jira untouched.
- Row icons: `ROW_ICON_CLASS` from NRT, lucide `size={16}`, `aria-hidden` icons, each control has `aria-label` and `title`; delete adds `hover:!text-danger`. Clicks in the actions cell must `stopPropagation`.
- Destructive button: `` `${PRIMARY_BUTTON_CLASS} !bg-danger` ``; cancel: `SECONDARY_BUTTON_CLASS`.
- Table styling like NRT: header `font-mono text-[11px] uppercase font-medium text-text-muted` on `bg-subtle`, body `text-[13px]`, numbers `font-mono text-[12px] text-text-dim`, outer card `rounded-[var(--radius)] border border-border bg-surface`.
- Base UI popover/tooltip hang in jsdom: in tests use `src/test/popover-mock.tsx` or render the content directly.
- No commits/pushes by the assistant: each task ends proposing a commit message; the user commits. Run `pnpm test` and `pnpm lint` before reporting.

## Review Focus

- Delete dialog opened on an entity deleted meanwhile (preview 404): shows an error, no crash, Elimina disabled.
- All Jira boxes unchecked: request sends `delete_jira_keys: []`.
- Partial Jira failure: dialog stays open listing failed keys and a "Chiudi" button; the lists are already refreshed.
- Undeletable feature/scope: icon disabled with explanatory tooltip, and the dialog (if reached) disables Elimina and lists blockers.
- Row icon clicks never navigate or select the scope card.
- Scope card was a `<button>`: after restructuring, keyboard users can still select a scope (Enter/Space) and reach the action icons.

---

## File Structure

- Modify `src/types/test-lifecycle.ts`, `src/hooks/useTestLifecycle.ts`.
- Modify `src/components/ui/formStyles.ts` (export `ROW_ICON_CLASS`), `src/components/nrts/NrtsTable.tsx` (import it).
- Create `src/components/test-lifecycle/TlDeleteDialog.tsx` (+ `.test.tsx`).
- Modify `FeatureTable.tsx`, `ScopeOverview.tsx`, `ScopeManagerDialog.tsx`, `FeatureHeader.tsx`, `src/app/(portal)/test-lifecycle/page.tsx` and `[id]/page.tsx`, with their existing tests.

### Task 1: Types and hooks

**Files:**
- Modify: `src/types/test-lifecycle.ts`, `src/hooks/useTestLifecycle.ts`
- Test: `src/hooks/useTestLifecycle.test.tsx` (follow its existing mocking style)

**Interfaces:**
- Produces types: `TlDeleteJiraIssue { key: string; role: "design" | "impl" | "qa_epic"; summary: string | null; status: string | null; url: string | null; feature_code: string | null; default_selected: boolean }`, `TlDeleteBlocker { feature_id: string; code: string; reason: "published" | "pr_open" }`, `TlDeletePreview { deletable: boolean; blockers: TlDeleteBlocker[]; features: { id: string; code: string; title: string | null }[]; scenario_count: number; jira_issues: TlDeleteJiraIssue[] }`, `TlJiraDeleteResult { key: string; status: "deleted" | "failed"; reason: string | null }`, `TlDeleteResult { deleted_features: number; jira_results: TlJiraDeleteResult[] }`; add `deletable: boolean` to `TlFeatureListItem` and `TlScope`.
- Produces hooks: `useTlDeletePreview(kind: "feature" | "scope", id: string | null)` returning `useQuery<TlDeletePreview>` for `GET ${BASE}/{features|scopes}/{id}/delete-preview` (enabled only when `id` is set; `gcTime: 0`); `useTlDelete(kind: "feature" | "scope")` returning a mutation with variables `{ id: string; deleteJiraKeys: string[] }` calling `DELETE ${BASE}/{features|scopes}/{id}` with body `{ actor_email, delete_jira_keys }` (actor from `useActorEmail()`), result `TlDeleteResult`; on success invalidates `["tl"]`.

- [ ] **Step 1: Write failing tests**: `useTlDeletePreview does not fetch without an id`; `useTlDeletePreview requests the feature preview url`; `useTlDelete sends actor_email and delete_jira_keys in the DELETE body`; `useTlDelete invalidates the tl queries on success`.
- [ ] **Step 2: Run** `pnpm vitest run src/hooks/useTestLifecycle.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** types and hooks as specified.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): add delete hooks and types`.

### Task 2: `TlDeleteDialog`

**Files:**
- Create: `src/components/test-lifecycle/TlDeleteDialog.tsx`
- Test: `src/components/test-lifecycle/TlDeleteDialog.test.tsx` (mock the two hooks from Task 1)

**Interfaces:**
- Consumes: Task 1 hooks and types; `Dialog*` from `@/components/ui/dialog`; button classes from `formStyles`.
- Produces: `export function TlDeleteDialog(props: { target: { kind: "feature" | "scope"; id: string; label: string } | null; onClose: () => void; onDeleted?: () => void })`. Open when `target` is not null. Content: title `Elimina feature <label>` / `Elimina ambito <label>`; summary line with counts (features, scenari); blockers list (each `code` with a reason text: `published` → "pubblicata su Git", `pr_open` → "PR aperta") and `Elimina` disabled when `deletable` is false; a "Issue Jira collegate" section with one checkbox per issue (key as link to `url`, summary, status, role label "Progettazione" / "Implementazione" / "Epic QA", and for scope previews the `feature_code`), initial state from `default_selected`, plus "Seleziona tutte" / "Nessuna" controls; a short note for the epic that it may be shared; error area (`role="alert"`) for preview/delete errors using `apiErrorMessage` from `@/lib/test-lifecycle`. After a successful delete: if every `jira_results` entry is `deleted` (or none) call `onDeleted` then `onClose`; otherwise stay open showing failed keys with reasons and a `Chiudi` button that calls `onDeleted` then `onClose`.

- [ ] **Step 1: Write failing tests**: `shows blockers and disables Elimina when not deletable`; `preselects design and impl issues but not the epic`; `sends only the checked keys when confirming`; `sends an empty key list when everything is unchecked`; `Seleziona tutte and Nessuna toggle every box`; `closes and calls onDeleted when all selected issues were deleted`; `stays open and lists failed keys on partial Jira failure`; `shows an error and disables Elimina when the preview fails`.
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/TlDeleteDialog.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the component per the interface above.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): add delete confirmation dialog`.

### Task 3: Shared row icon class and feature list

**Files:**
- Modify: `src/components/ui/formStyles.ts`, `src/components/nrts/NrtsTable.tsx` (line ~39: remove local const, import shared one; no visual change)
- Modify: `src/components/test-lifecycle/FeatureTable.tsx`
- Test: `src/components/test-lifecycle/FeatureTable.test.tsx`, `src/components/nrts/NrtsTable.test.tsx` (must still pass)

**Interfaces:**
- Produces: `export const ROW_ICON_CLASS: string` in `formStyles.ts` (value identical to the current NrtsTable constant: `rounded-sm p-1 text-text-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`).
- `FeatureTable` keeps its props. New actions column (header `<span className="sr-only">Azioni</span>`): `Eye` link to `/test-lifecycle/{id}` (`aria-label` `Apri feature {code}`), and `Trash2` button inside `<Gate action="edit:tl_feature">` (`aria-label` `Elimina feature {code}`), disabled with `title` "Feature pubblicata su Git o con PR aperta: non eliminabile" when `deletable` is false. Clicking opens `TlDeleteDialog` with `{ kind: "feature", id, label: code }`. Restyle: table per Global Constraints; the code column stays a link; filter labels styled like NRT labels (`font-mono text-[11px] uppercase text-text-muted`); a counter `{n} feature` in a toolbar row above the table (`font-mono text-[13px] text-text-muted`); `Scenari` column right-aligned mono; empty-state colSpan updated to the new column count.

- [ ] **Step 1: Write failing tests**: `renders view and delete icons for each row`; `hides the delete icon without edit:tl_feature`; `disables the delete icon with a tooltip when the feature is not deletable`; `clicking delete opens the dialog for that feature`; `clicking the actions cell does not follow the row link`; plus confirm the NRT table tests still pass.
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/FeatureTable.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** as specified.
- [ ] **Step 4: Run** `pnpm vitest run src/components/test-lifecycle/FeatureTable.test.tsx src/components/nrts`. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): add row actions and NRT styling to the feature list`.

### Task 4: Scope cards and scope manager

**Files:**
- Modify: `src/components/test-lifecycle/ScopeOverview.tsx`, `src/components/test-lifecycle/ScopeManagerDialog.tsx`, `src/app/(portal)/test-lifecycle/page.tsx`
- Test: `ScopeOverview` test (create `ScopeOverview.test.tsx` if absent), `src/app/(portal)/test-lifecycle/page.test.tsx`

**Interfaces:**
- Consumes: `TlDeleteDialog`, `ROW_ICON_CLASS`.
- `ScopeOverview` props gain `onEditScope?: (scope: TlScope) => void` and `onDeleteScope?: (scope: TlScope) => void`. The card becomes a `div` with `role="button"`, `tabIndex={0}`, `aria-pressed`, Enter/Space selecting the scope; a top-right icon cluster (`Pencil`, `Trash2`) wrapped in `Gate action="manage:tl_scopes"` with `stopPropagation`; delete disabled with `title` "Ambito con feature pubblicate o PR aperte: non eliminabile" when `deletable` is false. Restyle: code in mono semibold, name `text-[13px]`, counters in mono, selected card shows an accent ring plus `bg-accent-soft`.
- `ScopeManagerDialog` list rows get a `Trash2` next to the pencil (same gating and disabled rule) that calls a new prop `onDeleteScope?: (scope: TlScope) => void`; its optional new prop `initialEditScopeId?: string` opens directly in edit mode for that scope.
- `page.tsx` owns the delete target state (`TlDeleteTarget | null`), renders one `TlDeleteDialog`, clears the scope filter when the deleted scope was selected, and wires the card edit icon to open the manager on that scope. Header buttons switch to `SECONDARY_BUTTON_CLASS` (Guida, Anomalie, Migrazione, Gestisci ambiti), `Sincronizza ora` keeps its component but gets the same class, `Nuova feature` uses `PRIMARY_BUTTON_CLASS`.

- [ ] **Step 1: Write failing tests**: `selecting a scope card with Enter filters by it`; `scope action icons do not select the card`; `delete icon is hidden without manage:tl_scopes`; `delete icon is disabled for a non deletable scope`; `deleting the selected scope clears the scope filter`; `Gestisci ambiti list shows a delete icon per scope`; `page header uses primary style for Nuova feature`.
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/ScopeOverview.test.tsx "src/app/(portal)/test-lifecycle/page.test.tsx"`. Expected: FAIL.
- [ ] **Step 3: Implement** as specified.
- [ ] **Step 4: Run** `pnpm vitest run src/components/test-lifecycle "src/app/(portal)/test-lifecycle"`. Expected: PASS.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): add scope delete and restyle the page header`.

### Task 5: Feature detail header

**Files:**
- Modify: `src/components/test-lifecycle/FeatureHeader.tsx`, `src/app/(portal)/test-lifecycle/[id]/page.tsx`
- Test: `FeatureHeader.test.tsx`, `src/app/(portal)/test-lifecycle/[id]/page.test.tsx`

**Interfaces:**
- `FeatureHeader` gains optional props `onDelete?: () => void` and `deletable?: boolean` (default true). When `onDelete` is given, render inside `Gate action="edit:tl_feature"` a `SECONDARY_BUTTON_CLASS` button with `Trash2` icon and text `Elimina`, styled with `hover:!text-danger`, disabled with tooltip when `deletable` is false. `[id]/page.tsx` renders `TlDeleteDialog` with `{ kind: "feature", id, label: feature.code }`; on `onDeleted` it navigates to `/test-lifecycle` (use `router.push` as elsewhere on the page). The page derives `deletable` from the feature detail: `feature.git_path`/published revision/open PR are not on the detail type today, so use `useTlDeletePreview` lazily only inside the dialog and pass `deletable` from the list data only if the detail already carries it; otherwise leave the button enabled and rely on the dialog's blockers (the dialog already disables Elimina). Do not add fields to the detail type in this change.
- Restyle: code label mono, revision chip keeps its tokens, header buttons already use shared classes; metadata field labels in `FeatureMetaPanel` (`Titolo`, `Descrizione`, owners, Jira fields) switch to `font-mono text-[11px] uppercase text-text-muted`.

- [ ] **Step 1: Write failing tests**: `shows Elimina only with edit:tl_feature`; `Elimina opens the dialog and navigates to the list after deletion`; `metadata labels use the mono label style` (class assertion on one label).
- [ ] **Step 2: Run** `pnpm vitest run src/components/test-lifecycle/FeatureHeader.test.tsx "src/app/(portal)/test-lifecycle/[id]/page.test.tsx"`. Expected: FAIL.
- [ ] **Step 3: Implement** as specified.
- [ ] **Step 4: Run** the same command, then `pnpm test` and `pnpm lint`. Expected: all green; report pre-existing failures separately.
- [ ] **Step 5:** propose commit `feat(test-lifecycle): delete from the feature detail and align label style`; then manually check the pages in the browser (list, scope cards, dialog with Jira issues, detail header) in light and dark mode and report what was verified.
