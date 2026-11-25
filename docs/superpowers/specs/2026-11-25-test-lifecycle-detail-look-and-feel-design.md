# Test Lifecycle: feature detail page look and feel

Date: 2026-11-25
Repo: `pagopa-qa-centralhub-frontend` only (no backend change, no new dependency)
Size: small project (four packages, one branch, in this order).

## Intent and why

The feature detail page (`src/app/(portal)/test-lifecycle/[id]/`) works, but looks flat: a big white block of
full-width inputs (Metadati), scenario cards that all look the same, grey pills, and read-only selects that look
disabled even when they are editable (Tipo, Polarità). Nothing says at a glance where the feature is in its
lifecycle. The page is where QA analysts spend most of their time, so it should feel designed and pleasant,
while staying inside the portal style (hub tokens, mono labels, shared button classes, row icons, light and dark).

## Goals

1. Lifecycle progress strip under the header: Bozza, In review, Progettata, Implementata (the last reads
   "In esecuzione" when the feature is running), with the current step highlighted and previous steps checked.
2. Metadati panel more compact and readable: people as small chips with initials, Jira keys with coloured status
   chips, product and estimates on one row of columns, and the panel collapsible (the state is remembered) so the
   scenarios get the space; when collapsed a one-line summary keeps owners and Jira keys visible.
3. Scenario cards with identity: a left bar coloured by polarity (green positive, red negative), a tinted header,
   the scenario tag as a tinted pill, Tipo and Polarità as segmented controls instead of dropdown-looking boxes,
   extra tags as clearly on/off pills, a gentle hover elevation.
4. Calmer page rhythm: shared card style with a soft shadow, tab bar with an underline in the section colour,
   consistent spacing, and the accent colour of the "Progettazione test" area (`--area-violet`) used for the
   page highlights (progress strip, active tab, scenario tag).

## Non-goals

Two-column layout with a side panel (approach C, rejected for now); changing what the fields do, the save and
lock protocol, validation, shortcuts or the autocomplete; new pages or other sections of the portal; the
state rollback feature and the highlight fix (separate work).

## Anti-goals

Any loss of function or of keyboard/screen-reader access; lower contrast than today in light or dark theme
(text at least 4.5:1, icons and markers at least 3:1); editable controls that look read-only (or the reverse);
layout shift while typing or saving; colour as the only carrier of meaning (polarity and status always also have
text); a different look from the rest of the portal.

## Decisions

Confirmed by the person: approach B (polish plus structure), staying within the portal style.

My calls (to confirm when reading):
- The progress strip follows the current revision: `draft` is Bozza, `in_review` In review, `approved`
  Progettata, `merged` Implementata; when the feature is `running` the last step reads "In esecuzione".
  A reopened draft of an implemented feature therefore shows Bozza as current, with the earlier steps
  as done, consistent with the diagram in the guide.
- Polarity colours use the existing semantic tokens (`--success`, `--danger` and their `-soft` pairs);
  the polarity is always also written ("Positivo" / "Negativo"), never colour alone.
- Tipo and Polarità become segmented controls built as a radio group (native radio inputs, arrow-key navigation);
  in read-only mode they show as plain chips.
- The metadata panel collapse state is stored with `useStoredFlag` (key `qa-hub-tl-meta-open`, default open);
  collapsed shows title, owner chips and Jira chips on one line.
- People chips show initials from the user name (two letters) on a neutral tint; no avatars or images.
- Field labels keep the mono uppercase style but use `--text-dim` instead of `--text-muted` (readability).
- The section accent is `--area-violet` / `--area-violet-soft` from the sidebar work; no new colour tokens.
- Existing tests that select the old dropdowns (Tipo, Polarità) are updated to the new controls; behaviour
  covered by the tests stays the same.

## Approaches considered

A. Polish only (shadows, chips, spacing): lowest risk, the page still lacks orientation.
B. Polish plus progress strip, compact metadata and scenario identity (chosen).
C. Two-column layout with a fixed metadata side panel: strongest effect, but it restructures the page and the
   narrow-screen behaviour; kept as a possible later step.

## Constraints

Read `node_modules/next/dist/docs/` before Next code (repo AGENTS.md); pnpm; `pnpm test`, `pnpm lint` and
`npx tsc --noEmit` green; tests co-located; hub tokens only (no raw hex in components); UI copy Italian;
`src/test/popover-mock.tsx` for Base UI popovers; beware that Base UI tooltips slow jsdom tests under load.
No commits or PRs by the assistant. The page cannot be viewed here against a real backend, so the person
checks it visually (both themes, narrow and wide) before the PR.

## Left to the builder

Exact spacing and shadow values, icons, the segmented control markup, the collapsed-summary layout, the order
of work inside each package, and how the progress strip is split into components.

## Delivery

New branch `feature/test-lifecycle-detail-look` cut from an up-to-date `main`, after the person has committed the
highlight fix (`fix/steps-editor-highlight`), so the two pieces stay separate PRs.
