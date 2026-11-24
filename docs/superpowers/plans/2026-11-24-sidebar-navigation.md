# Sidebar navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Regroup the portal sidebar into 8 colour-coded collapsible sections with a filter field, readable titles and a colour-preserving icon rail.

**Architecture:** Move the nav data out of `Sidebar.tsx` into `nav-config.ts` (sections with an area tone, plus a pure `matchesQuery`). Split rendering into `NavItemLink` (one entry) and `NavSection` (title, collapse, persisted state). `Sidebar` keeps permissions/feature visibility, the rail toggle and the filter. Area colours are new CSS tokens.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, lucide-react, Vitest + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-24-sidebar-navigation-design.md`

## Global Constraints

- Run everything from `/Users/andrea.ferracci/projects/pagopa-qa-centralhub-frontend`; shell is zsh; use pnpm.
- Start on a new branch `feature/sidebar-navigation` from an up-to-date `main` (`git checkout main && git pull --ff-only`). Never commit or push: the user does it.
- Read `node_modules/next/dist/docs/` before touching Next-specific code (this task needs none beyond `usePathname`).
- Entry labels, hrefs, `action`, `featureKey`, `requiresSuperadmin` and the `isVisible` rules do not change.
- UI copy Italian; code, comments and docs English. Tokens only (`var(--...)`), no raw hex in components.
- Title text uses `--text`; colour is carried by the marker and icons only. Non-text contrast >= 3:1, text >= 4.5:1 in both themes.
- Storage key per section: `qa-hub-nav-open-<section id>` via `useStoredFlag(key, !defaultClosed)`. Rail state key `qa-hub-sidebar-collapsed` unchanged.
- Existing `Sidebar.test.tsx` cases must keep passing (they stub localStorage and `next/navigation`).

## Review Focus

- Person allowed to see only entries of a closed section (for example only Admin): section still appears, closed, with a correct count; filter still finds them.
- Current page inside a closed section: the section opens and the active entry is visible.
- Filter text matching nothing: empty-state message, no empty section titles left behind.
- Ctrl/Cmd+K while typing in another input or textarea elsewhere on the page: must not hijack unrelated typing (only the shortcut chord is handled, and only when the rail is expanded).
- Rail mode with closed sections: every visible entry is still reachable with its accessible name.

---

### Task 1: Nav config and section mapping

**Files:**
- Create: `src/components/shell/nav-config.ts`
- Create: `src/components/shell/nav-config.test.ts`
- Modify: `src/components/shell/Sidebar.tsx` (consume the config; keep markup for now)

**Interfaces:**
- Produces:
  - `type AreaTone = "blue" | "coral" | "violet" | "green" | "amber" | "teal" | "pink" | "gray"`
  - `interface NavItem { href: string; label: string; icon: LucideIcon; external?: boolean; action?: string; requiresSuperadmin?: boolean; featureKey?: string }` (moved unchanged from `Sidebar.tsx`)
  - `interface NavSectionConfig { id: string; label: string; tone: AreaTone; defaultClosed?: boolean; items: NavItem[] }`
  - `NAV_SECTIONS: NavSectionConfig[]` (ids: `workspace`, `architecture`, `design`, `results`, `release`, `data`, `knowledge`, `admin`)
  - `normalizeText(value: string): string` (lowercase, NFD, strip combining marks)
  - `matchesQuery(section: NavSectionConfig, item: NavItem, query: string): boolean` (true for empty query; true if the normalised item label or section label contains the normalised query)

- [ ] **Step 1: Write failing tests in `nav-config.test.ts`**
  - `has the eight sections in order` — ids equal `["workspace","architecture","design","results","release","data","knowledge","admin"]`.
  - `puts EA Map alone in architecture` — `architecture` labels equal `["EA Map"]`; `design` labels equal `["Gherkin Generator","Test Lifecycle"]`.
  - `only admin is closed by default` — `NAV_SECTIONS.filter(s => s.defaultClosed).map(s => s.id)` equals `["admin"]`.
  - `keeps sapere and admin separate` — `knowledge` labels `["Docs & Decks","API Docs"]`; `admin` labels `["Settings Gherkin","Settings Utenti","Settings Pagoda","Risorse T&M"]`.
  - `maps each entry to the agreed section` — one assertion per section listing item labels exactly as in the spec mapping.
  - `has no duplicate routes or labels` — hrefs (excluding the empty NRT Metrics one) and labels unique.
  - `has no duplicate icons` — `new Set(items.map(i => i.icon)).size === items.length`.
  - `matchesQuery ignores case and accents` — `"qualita"` matches section "Dati e qualità" items; `"POSIZIONI"` matches "Posizioni Debitorie GPD"; `""` matches everything; `"zzz"` matches nothing.
- [ ] **Step 2: Run** `pnpm vitest run src/components/shell/nav-config.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement `nav-config.ts`** moving `NavItem`, items and icons out of `Sidebar.tsx`; tones: workspace blue, architecture coral, design violet, results green, release amber, data teal, knowledge pink, admin gray. Icons that change: Catalogo Controlli `BookCheck`, Settings Gherkin `Settings2`, Settings Pagoda `Bot`; every other entry keeps its icon.
- [ ] **Step 4: Update `Sidebar.tsx`** to import `NAV_SECTIONS` and iterate it exactly like `NAV_GROUPS` (rename variable only; markup unchanged this task).
- [ ] **Step 5: Run** `pnpm vitest run src/components/shell` — Expected: PASS (new tests and all existing Sidebar tests; the order tests for Overview/Messaggi/EA Map and NRT/flaky still hold).
- [ ] **Step 6: Checkpoint** (no commit; the user commits): `npx tsc --noEmit` clean.

### Task 2: Area tokens, entry and title styling

**Files:**
- Modify: `src/app/globals.css` (tokens, light block near `--accent` and dark block)
- Create: `src/components/shell/NavItemLink.tsx`
- Create: `src/components/shell/NavItemLink.test.tsx`
- Modify: `src/components/shell/Sidebar.tsx`

**Interfaces:**
- Consumes: `NavItem`, `AreaTone` from Task 1.
- Produces:
  - tokens `--area-<tone>` and `--area-<tone>-soft` for the eight tones, light and dark.
  - `NavItemLink(props: { item: NavItem; href: string; tone: AreaTone; active: boolean; rail: boolean; unread?: number })` rendering the three variants that exist today (internal `Link`, external `a`, disabled `span` when `href` is empty) with identical attributes, titles, `aria-describedby` and external-link indicator, plus the new look.
  - `areaStyle(tone: AreaTone): React.CSSProperties` exported from `NavItemLink.tsx` returning `{ "--area": "var(--area-<tone>)", "--area-soft": "var(--area-<tone>-soft)" }`.

- [ ] **Step 1: Write failing tests in `NavItemLink.test.tsx`**
  - `marks the active entry with aria-current page` — render with `active`; link has `aria-current="page"`; inactive has none.
  - `shows the unread pill when unread > 0 and expanded` — `data-testid="sidebar-unread"` text `3`; absent when `rail`.
  - `keeps the rail accessible name and title` — `rail` true: link name equals label (sr-only text) and `title` equals label.
  - `keeps the external variant` — external with href: `target="_blank"`, `rel="noopener noreferrer"`, `title` "<label> (si apre in una nuova scheda)"; with empty href: `aria-disabled="true"` span, no link.
- [ ] **Step 2: Run** `pnpm vitest run src/components/shell/NavItemLink.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Add the 16 tokens to `globals.css`.** Light: ink L≈0.50 C≈0.15 (green/teal/amber slightly adjusted so the 3:1 non-text target holds on `--surface`), soft L≈0.96 C≈0.04. Dark: ink L≈0.75, soft L≈0.27 C≈0.07. Hues: blue 252 (reuse `--accent`/`--accent-soft`), coral 35, violet 295, green 145, amber 85, teal 185, pink 350, gray neutral. Coral and amber must stay visibly different side by side (Architettura is adjacent to Workspace, not to Release; check anyway). Verify contrast with a quick script or devtools and note the values checked in the commit-ready summary.
- [ ] **Step 4: Implement `NavItemLink`** moving the link markup out of `Sidebar.tsx`. Expanded: icon 18px (`strokeWidth` 1.75) in `var(--area)`, label 14px `--text`; active: `background: var(--area-soft)`, 2px `var(--area)` left border, `font-medium`; hover `bg-hover`. Rail: icon 18px centred, same colours.
- [ ] **Step 5: Use `NavItemLink` in `Sidebar.tsx`.** Section title block becomes: 8-9px rounded square in `var(--area)` plus label 12px `font-semibold` uppercase `tracking-[0.06em]` in `--text` (the collapsible behaviour arrives in Task 3). Wrap each section with `style={areaStyle(section.tone)}`.
- [ ] **Step 6: Run** `pnpm vitest run src/components/shell` — Expected: PASS.

### Task 3: Collapsible sections with persisted state

**Files:**
- Create: `src/components/shell/NavSection.tsx`
- Create: `src/components/shell/NavSection.test.tsx`
- Modify: `src/components/shell/Sidebar.tsx`, `src/components/shell/Sidebar.test.tsx` (make the pathname mock configurable: `vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }))`, default `"/"`)

**Interfaces:**
- Consumes: `useStoredFlag` (`src/lib/stored-flag.ts`), `areaStyle`.
- Produces: `NavSection(props: { id: string; label: string; tone: AreaTone; defaultClosed?: boolean; count: number; hasActive: boolean; forceOpen: boolean; rail: boolean; children: React.ReactNode })`. Renders: in `rail`, a thin divider then children; otherwise a header `button` (`aria-expanded`, `aria-controls` pointing at the items container, marker, label, count only when closed, chevron that rotates) and the items container rendered only when open. Open = stored flag (`qa-hub-nav-open-<id>`, fallback `!defaultClosed`) or `forceOpen`. When `hasActive` turns true while closed, an effect sets the flag open.

- [ ] **Step 1: Write failing tests**
  - `NavSection.test.tsx`: `renders children when open and toggles on click` (button name matches the label; `aria-expanded` flips; children unmounted when closed); `starts closed when defaultClosed` ; `shows the entry count only when closed`; `remembers the state across remounts` (stubbed localStorage); `opens by itself when it becomes the active section`; `ignores the stored state when forceOpen`; `renders all children and no button in rail mode`.
  - `Sidebar.test.tsx`: `keeps Admin closed by default and opens it on click` (Settings Gherkin link absent, then present after clicking the "Admin" button); `opens the section of the current page` (`mocks.pathname = "/settings/bdd"` → Settings Gherkin link present without clicks); `shows a section whose only visible entries are closed ones` (restrict `mocks.can` so only admin entries are allowed: the Admin button exists with count 1... adjust to the real allowed set).
- [ ] **Step 2: Run** the two files — Expected: FAIL.
- [ ] **Step 3: Implement `NavSection.tsx`** and use it in `Sidebar.tsx`: compute `items = section.items.filter(isVisible)`, skip when empty, `hasActive` from the same `isActive` rule used for entries, pass `NavItemLink`s as children, `rail={collapsed}`, `forceOpen={false}` for now.
- [ ] **Step 6: Run** `pnpm vitest run src/components/shell` — Expected: PASS, including the old rail test (rail shows every entry).

### Task 4: Filter field and Ctrl/Cmd+K

**Files:**
- Modify: `src/components/shell/Sidebar.tsx`, `src/components/shell/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `matchesQuery` (Task 1), `NavSection.forceOpen` (Task 3).
- Produces: a filter `input` (`type="search"`, `aria-label="Cerca voce"`, placeholder "Cerca voce") with a search icon and a `Ctrl K` hint, rendered only when not in rail mode; local `query` state.

- [ ] **Step 1: Write failing tests in `Sidebar.test.tsx`**
  - `filters entries by label` — type "flaky": only "Scenari flaky" link remains; other titles/sections without matches are gone.
  - `ignores case and accents` — "qualita" shows the four entries of Dati e qualità.
  - `finds entries inside closed sections` — type "pagoda": Settings Pagoda link visible although Admin is closed; clearing the field restores the closed state.
  - `shows an empty message` — "zzzz" shows "Nessuna voce trovata" and no section buttons.
  - `Escape clears the filter` — after typing, `keyDown Escape` empties the input.
  - `Ctrl+K focuses the filter` and `Cmd+K focuses the filter` — `fireEvent.keyDown(document, { key: "k", ctrlKey: true })` / `metaKey`; `document.activeElement` is the input; default prevented.
  - `does not react to a plain k or when the rail is collapsed` — no focus change; filter input absent in rail.
- [ ] **Step 2: Run** `pnpm vitest run src/components/shell/Sidebar.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** For each section: `items = visible.filter(item => matchesQuery(section, item, query))`; hide sections with no items; pass `forceOpen={query.trim() !== ""}`; when every section is empty and a query exists render the empty message. Add a `keydown` listener on `document` (effect, cleaned up) that handles only `(ctrlKey || metaKey) && key.toLowerCase() === "k"` when not in rail mode: `preventDefault()`, focus the input. Escape inside the input clears the query. The title count shows the filtered number only when the section is closed and the query is empty.
- [ ] **Step 4: Run** `pnpm vitest run src/components/shell` — Expected: PASS.

### Task 5: Rail check, full verification and docs

**Files:**
- Modify (only if the rail needs it): `src/components/shell/Sidebar.tsx`
- Modify: `README.md` only if it documents the sidebar structure (check with `grep -n -i sidebar README.md`); otherwise none.

- [ ] **Step 1: Run the whole suite and checks:** `pnpm test`, `pnpm lint`, `npx tsc --noEmit`. Expected: all green, lint 0 errors (3 known warnings may remain), tests count at least the previous count.
- [ ] **Step 2: Visual check in the browser** (`pnpm dev`, backend or mocked data as available): expanded and rail, light and dark theme, narrow and tall viewport. Check: titles readable in light theme, the active entry visible, Admin closed on first load, section state remembered after reload, filter and Ctrl/Cmd+K, scrolling with the filter field fixed, NRT Metrics opens a new tab. Record anything not verified.
- [ ] **Step 3: Contrast check** of the 16 tokens in both themes against `--surface` (icons and marker >= 3:1, soft backgrounds with `--text` >= 4.5:1); adjust values in `globals.css` if needed and re-run Step 1.
- [ ] **Step 4: Summarise for the PR** (title, description with the checks above and what was not verified). Do not commit or push.
