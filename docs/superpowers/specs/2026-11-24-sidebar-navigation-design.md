# Sidebar navigation: orientation and visual hierarchy

Date: 2026-11-24
Repo: `pagopa-qa-centralhub-frontend` only (no backend change, no new dependency)
Size: small project (one component family, one branch).

## Intent and why

The portal sidebar (`src/components/shell/Sidebar.tsx`) has grown to 12 groups and about 22 entries.
The person using it reports four problems: it is hard to find their way around, the group titles are
barely visible, finding a specific entry is slow, and the whole menu looks grey and disabled.

Causes found in the code:
- Group titles are 10px, mono, `--text-muted` (about 2.9:1 on white, below WCAG AA), while entries are
  14px `--text-dim`: hierarchy and legibility are both weak.
- 6 of the 12 groups hold a single entry, so the title costs more space than the content.
- Every icon is 15px, thin and `--text-dim`; colour exists only on the active entry (soft blue).
- `Sparkles` is used by three entries and `ShieldCheck` by two, so icons do not help tell entries apart.

## Goals

1. Fewer, clearer groups: 8 sections instead of 12.
2. Section titles that are easy to read in light and dark theme.
3. A colour per area (icon plus a small marker next to the title) so the menu reads as structured, not disabled.
4. Collapsible sections whose state is remembered; the section of the current page is always reachable open.
5. A filter field that narrows the entries while typing, with Ctrl/Cmd+K to focus it.
6. The icon-only rail keeps working and keeps the area colours.

## Non-goals

Command palette, favourites/pinning, recently visited entries, drag-to-reorder, any change to routes,
permissions or feature flags, any backend or API change, a new dependency.

## Anti-goals

Hiding an entry the person is allowed to see; breaking the permission/feature-flag rules in `isVisible`;
colour as the only carrier of meaning (every area also has a text title); a filter or shortcut that
steals typing from other fields; layout shift between rail and expanded modes.

## Decisions

Confirmed by the person (mockup reviewed, light and dark):
- Approach B: restructure plus restyle plus filter field.
- Sections: Workspace, Architettura, Progettazione test, Risultati test, Release e tracking, Dati e qualità, Sapere, Admin.
  "Sapere" and "Admin" are separate sections; "Admin" is collapsed by default.
- EA Map is the architecture map of the whole system, so it is not a test-design entry: it gets its own
  "Architettura" section placed right below Workspace (a single-entry section on purpose, with room for
  future architecture entries).
- Section titles: full-contrast text colour, 12px semibold uppercase, sans-serif; the area colour lives on the
  small square marker and the icons (the first mockup used coloured mono 11px titles and was too faint in light theme).

My calls (to confirm when reading):
- Section mapping:
  - Workspace: Overview, Messaggi.
  - Architettura: EA Map.
  - Progettazione test: Gherkin Generator, Test Lifecycle.
  - Risultati test: SANP Health, Non-Regression Tests (NRT), Scenari flaky, Test Automation Service (TAS),
    Quality Gate, NRT Metrics.
  - Release e tracking: Status Page, KPI Jira.
  - Dati e qualità: PSP Commissioni, Posizioni Debitorie GPD, Catalogo Controlli, Controlli per Dominio.
  - Sapere: Docs & Decks, API Docs (moved from Amministrazione).
  - Admin: Settings Gherkin, Settings Utenti, Settings Pagoda, Risorse T&M.
- Entry labels, routes, actions and feature keys do not change.
- Duplicate icons fixed: Catalogo Controlli gets `BookCheck`, Settings Gherkin `Settings2`, Settings Pagoda `Bot`.
- Open/closed state is stored per section in localStorage (existing `useStoredFlag`), key
  `qa-hub-nav-open-<section id>`; when the current page belongs to a closed section, that section opens.
- Filter: matches the entry label or the section title, ignoring case and accents; while it is not empty
  the collapse state is ignored (matches inside closed sections are shown) and sections without matches
  disappear; Escape clears it; an empty result shows "Nessuna voce trovata".
- Ctrl/Cmd+K focuses the filter (preventDefault, so the browser or other shortcuts are not triggered);
  the filter is hidden in the icon rail and the shortcut is then inactive.
- Enter in the filter does not navigate (kept out of scope; the entries are keyboard-reachable with Tab).
- In the rail, sections are not collapsible: every visible entry is shown, separated by a thin line per section.
- Colours: eight area tokens (`--area-blue|coral|violet|green|amber|teal|pink|gray` plus `-soft`; coral is for Architettura, amber hue moves slightly away from it) in `globals.css`,
  tuned per theme; non-text contrast of icons and active marker at least 3:1, titles and entries at least 4.5:1.
- Count shown on a collapsed section title is the number of visible entries.

## Approaches considered

A. Restyle only (bigger titles, colour, active bar): cheapest, does not fix a long, flat list.
B. Restyle plus regroup plus collapsible sections plus filter: chosen; fixes orientation, search and look together.
C. B plus command palette and favourites: fastest navigation, but a larger feature than this problem needs.

## Constraints

Read `node_modules/next/dist/docs/` before Next code (repo AGENTS.md); pnpm; `pnpm test`, `pnpm lint` and
`npx tsc --noEmit` green; tests co-located; hub design tokens only (no raw hex in components); UI copy Italian;
existing `useStoredFlag`, `usePermissions`, `useFeatureVisibility` behaviour untouched. No commits or PRs by the assistant.

## Left to the builder

Exact oklch values of the area tokens (within the contrast targets), spacing, how the nav config file is split,
test layout, and the exact chevron/count visuals.

## Delivery

New branch `feature/sidebar-navigation` cut from an up-to-date `main` (previous work is merged).
Check the result visually in light and dark theme, expanded and rail, before opening the PR.
