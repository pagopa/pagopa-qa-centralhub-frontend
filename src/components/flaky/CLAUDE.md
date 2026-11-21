# Flaky Scenarios — durable rules

Backend rules and rationale live in the backend repo `CLAUDE.md` ("Flaky Scenarios"); this file
covers the UI only (`/flaky-scenarios` page and the flakiness column in the run detail).

- **Types** in `src/types/flaky.ts` mirror the backend schemas; data comes only through
  `src/hooks/useFlaky.ts`. New fields are optional or nullable.
- **Scenario key** is `test_object` + `test_type` + `scenario_name` (`flakyScoreKey`, matching in
  `src/utils/nrtUtils.ts`): never match flags or scores by suite or version.
- **Index colors** use the tokens `--flaky-l1` … `--flaky-l5` (green → red); "Rotto" and
  "Dati insuff." are neutral badges, not a level color. Score measures instability, so a broken
  scenario may show score 0: keep that explained in the copy.
- **"Come funziona"** (`FlakyHowItWorks`) repeats the backend parameters (window, max runs,
  half-life, thresholds 5/15/30/50, hint rules): update it when the backend `FLAKY_*` settings
  change. Tests render `FlakyHowItWorksContent` directly because the Base UI popover hangs in
  jsdom.
- **Permissions**: `view:flaky` guards the route, `manage:flaky` (all but guest) gates flagging
  and manual recompute. The backend does not enforce them, so actions must stay hidden in the UI;
  flag requests send the user's email.
- **Run detail** statuses arrive uppercase from the API: compare them case-insensitively.
- UI copy is Italian; colors come from the hub tokens and must work in light and dark mode.
