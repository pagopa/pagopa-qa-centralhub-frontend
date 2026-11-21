# Status Page (release-status) — durable rules

Backend rules and rationale live in the backend repo `CLAUDE.md` and
`docs/status-page/`; this file covers the UI only.

- **Types** in `src/types/release-status.ts` mirror the backend schemas. New fields are optional
  or nullable, so the UI keeps working with an older backend; render nothing when they are absent.
- **Reliable data or nothing** in the UI too: no badge, popover or summary when the backend gives
  no reliable value; `PENDING` / `UNAVAILABLE` / `ERROR` each have their own Italian copy.
- **Filters** map `StatusFilter` to an `AppFlag` (`FLAG_BY_FILTER` in `src/lib/release-status.ts`);
  an unknown `?filter=` falls back to "Tutti". "Sotto test QA" = `UNDER_QA`; `UNTESTED` is unused.
- **Base UI popovers** (`ChangePopover`) are always controlled (`open` state); never switch a
  popover between controlled and uncontrolled. Grid cells load the application detail lazily
  (`useApplicationDetail` only once a cell is armed by hover, focus or click).
- **Tests** mock Base UI popover/tooltip (`src/test/popover-mock.tsx`, tooltip mocks that honour
  `render`) because the real ones are too slow in jsdom; real hover/Escape is checked in DEV.
- **Chips**: status chips use the soft hub tokens; the technology chip (`StackChip`) is a solid
  pill with white text and one color per language (`STACK_COLOR`, contrast ≥ 4.5 with white).
  A new backend language needs a color there (fallback: accent).
- UI copy is Italian; colors come from the hub tokens and must work in light and dark mode.
