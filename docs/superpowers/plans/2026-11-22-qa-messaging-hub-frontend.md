# QA Messaging Hub (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the notification bell (three states, unread counter), its quick panel, a "Messaggi" page and a sidebar entry to the QA Hub portal, backed by the messaging API.

**Architecture:** Typed hooks on `@tanstack/react-query` call `/api/v1/messaging/*` through the existing `apiClient`, adding the session email as `X-User-Email`. Pure helpers in `src/lib/messaging.ts` decide the bell state, badge text, grouping and tag metadata so the components stay thin. Components live in `src/components/messaging/` and use the existing tokens and primitives.

**Tech Stack:** Next.js 16 App Router (not the Next.js you know: before writing code read the relevant guide in `node_modules/next/dist/docs/`, as `AGENTS.md` requires), React 19, TypeScript, Tailwind 4 plus CSS tokens, `@tanstack/react-query`, `next-auth`, `lucide-react`, vitest and Testing Library, pnpm.

**Spec:** `pagopa-qa-centralhub-backend/docs/superpowers/specs/2026-11-22-qa-messaging-hub-design.md` (sections 5.9 and 5.10). The approved look is the mockup reviewed with the owner (bell states, quick panel, page); its structure is reproduced in the tasks below. Backend plan: `pagopa-qa-centralhub-backend/docs/superpowers/plans/2026-11-22-qa-messaging-hub.md`. **The backend deploys first.**

## Global Constraints

- Package manager is pnpm; do not use npm; commit `package.json` and `pnpm-lock.yaml` together if dependencies change (none are expected).
- User-visible text is Italian. Code, comments, test names, commit messages are English.
- Use design tokens (`--accent`, `--success`, `--warning`, `--danger`, `--info`, their `-soft` variants, `--text*`, `--border*`, `--radius*`, `--shadow-*`); no hard-coded colours. Light and dark themes (`[data-theme="dark"]`) must both work.
- Bell badge text is the count, or `"9+"` above nine; badge and tint colour follow the most severe unread message (`info` accent, `warning` amber, `critical` danger).
- Bell states: no messages (`total = 0`), all read (`total > 0`, `unread = 0`, green check mark), unread (tinted circle with counter).
- Polling: summary every 60 000 ms and on window focus; no WebSocket or SSE.
- Everything is gated by the permission `view:inbox` (`usePermissions().can("view:inbox")`): without it, no bell, no sidebar entry, and the page shows what other gated pages show.
- The bell ring animation must be disabled under `prefers-reduced-motion: reduce`.
- Links in messages are relative frontend paths from the API (`/nrts`, `/sanp-health`, `/quality-gate/report/<id>`); render them with `next/link`.
- Do not commit or push without the owner's explicit confirmation; each task ends with a proposed commit shown to the owner. Before each proposal run `pnpm lint` and `pnpm test` (the relevant files at least) and report results.

## Review Focus

- Summary query fails or is loading: the bell must render a neutral state, never crash or show a stale count as "all read" (Task 3).
- Session has no email yet: no request is sent (`enabled` false) and no 401 toast loop (Task 2).
- A message with an unknown `type` or a missing `link`: card renders with a generic tag and no button (Tasks 1, 4).
- More than nine unread, or a count of exactly zero after "mark all read": badge text and state transition are right (Tasks 1, 3).
- Dark theme: unread tint and badge stay legible (Task 3 visual check).
- Marking one message read updates the bell, the panel and the page without a reload (Task 2).

## File Structure

```
src/types/messaging.ts                    # API types
src/lib/messaging.ts (+ .test.ts)         # pure helpers
src/hooks/useMessaging.ts (+ .test.tsx)   # react-query hooks
src/components/messaging/
  NotificationBell.tsx (+ test)           # bell button with three states and badge
  MessagePanel.tsx (+ test)               # quick panel content in a popover
  MessageCard.tsx (+ test)                # card used by the page
  MessageFilters.tsx (+ test)             # segmented control and chips
  MessagesEmptyState.tsx                  # friendly empty state
src/app/(portal)/messages/page.tsx (+ test)
src/app/globals.css                       # --warning-ink token, bell ring keyframes
src/components/shell/Topbar.tsx           # mount the bell, page title
src/components/shell/Sidebar.tsx          # "Messaggi" entry with unread count
```

---

### Task 1: Types, helpers and tokens

**Files:**
- Create: `src/types/messaging.ts`, `src/lib/messaging.ts`, `src/lib/messaging.test.ts`
- Modify: `src/app/globals.css` (add `--warning-ink` in the light block and the `[data-theme="dark"]` block where `--warning` is defined; add `@keyframes bell-ring` and a `.bell-ring` class that animates only inside `@media (prefers-reduced-motion: no-preference)`)

**Interfaces:**
- Produces:
  - `type Severity = "info" | "warning" | "critical"`.
  - `interface InboxItem { id: string; title: string; body: string; link: string | null; severity: Severity; type: string; created_at: string; read_at: string | null; auto_read: boolean }`.
  - `interface InboxPage { items: InboxItem[]; next_cursor: string | null }`; `interface InboxSummary { unread: number; total: number; max_unread_severity: Severity | null }`.
  - `type BellState = "empty" | "read" | "unread"`.
  - In `lib/messaging.ts`: `bellState(summary: InboxSummary | undefined): BellState | "unknown"` (`undefined` gives `"unknown"`); `formatBadge(unread: number): string`; `bellTone(severity: Severity | null): Severity` (null falls back to `"info"`); `bellLabel(summary: InboxSummary | undefined): string`; `groupByDay(items: InboxItem[], now: Date): { label: string; items: InboxItem[] }[]` (labels `"Oggi"`, `"Ieri"`, otherwise the date in Italian long form such as `"22 novembre 2026"`; preserves input order); `severityCounts(items: InboxItem[]): Record<Severity, number>` (unread only); `typeMeta(type: string): { label: string; icon: LucideIcon }` (`it.pagopa.qa.quality_gate.run.completed` gives `Quality Gate` with `ShieldCheck`, `...nrt.reviews.pending` gives `NRT` with `ClipboardCheck`, `...sanp_health.checks.failing` gives `SANP Health` with `Activity`, anything else `Sistema` with `Bell`).

- [ ] **Step 1: Write failing tests** in `src/lib/messaging.test.ts`:
  - `bellState`: `{unread:0,total:0}` gives `"empty"`; `{unread:0,total:4}` gives `"read"`; `{unread:2,total:4}` gives `"unread"`; `undefined` gives `"unknown"`.
  - `formatBadge`: `1 -> "1"`, `9 -> "9"`, `10 -> "9+"`, `120 -> "9+"`.
  - `bellLabel`: `"Nessun messaggio"`, `"Tutti i messaggi sono stati letti"`, `"1 messaggio non letto"`, `"3 messaggi non letti"`.
  - `bellTone(null) === "info"`; `bellTone("critical") === "critical"`.
  - `groupByDay` with `now = 2026-11-22T10:00:00` and items at `2026-11-22T08:00`, `2026-11-21T20:00`, `2026-11-10T09:00` gives groups `Oggi`, `Ieri`, `10 novembre 2026`, order preserved.
  - `severityCounts` counts only items with `read_at === null`.
  - `typeMeta` for the three known types and an unknown one.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/messaging.test.ts`; expect FAIL.
- [ ] **Step 3: Implement** the types, helpers and the CSS tokens. `--warning-ink` is a darker amber for text on `--warning-soft` (light: `oklch(0.5 0.12 70)`; dark: `oklch(0.85 0.12 78)`).
- [ ] **Step 4: Run** the test; expect PASS. Run `pnpm lint`.
- [ ] **Step 5: Propose commit** `feat: add messaging types, helpers and tokens`.

---

### Task 2: Data hooks

**Files:**
- Create: `src/hooks/useMessaging.ts`, `src/hooks/useMessaging.test.tsx`

**Interfaces:**
- Consumes: `apiClient` (`src/lib/api.ts`, accepts `headers` through `RequestInit`), `useSession` (`next-auth/react`), `usePermissions`.
- Produces:
  - `interface InboxFilters { unreadOnly: boolean; severity: Severity | "all"; type: string | "all" }`, `DEFAULT_INBOX_FILTERS: InboxFilters` (`{unreadOnly:false,severity:"all",type:"all"}`), `inboxFiltersToParams(filters: InboxFilters): URLSearchParams` (omits defaults: only `unread_only=true`, `severity=<v>`, `type=<v>` when set).
  - `useInboxSummary()` returning the `useQuery` result for `GET /api/v1/messaging/inbox/summary`; `queryKey ["inbox","summary"]`, `refetchInterval: 60_000`, `refetchOnWindowFocus: true`, `enabled` only when the session email exists and `can("view:inbox")` is true.
  - `useInbox(filters: InboxFilters)` using `useInfiniteQuery` on `GET /api/v1/messaging/inbox?...&limit=30&cursor=...` (key `["inbox","list", filters]`, next page param from `next_cursor`, same `enabled` rule).
  - `useMarkRead()` mutation `(id: string) => POST /api/v1/messaging/inbox/{id}/read`; `useMarkAllRead()` mutation `POST /api/v1/messaging/inbox/read-all`; both invalidate `["inbox"]` on success.
  - Every request sends the header `X-User-Email` with the session email.

- [ ] **Step 1: Write failing tests** following `src/hooks/useFlaky.test.tsx` (hoisted `apiClient` mock, `QueryClientProvider` wrapper, `useSession` mocked): the summary request URL and header; no request and no error when the session has no email; no request when `can("view:inbox")` is false; `inboxFiltersToParams` omits defaults and sets the three params; `useInbox` requests the next page with the cursor; both mutations call the right path with `method: "POST"` and invalidate `["inbox"]` (spy on `invalidateQueries`).
- [ ] **Step 2: Run** `pnpm vitest run src/hooks/useMessaging.test.tsx`; expect FAIL.
- [ ] **Step 3: Implement** the hooks.
- [ ] **Step 4: Run** the test; expect PASS.
- [ ] **Step 5: Propose commit** `feat: add messaging data hooks`.

---

### Task 3: Notification bell and quick panel in the topbar

**Files:**
- Create: `src/components/messaging/NotificationBell.tsx`, `NotificationBell.test.tsx`, `MessagePanel.tsx`, `MessagePanel.test.tsx`
- Modify: `src/components/shell/Topbar.tsx` (mount `<NotificationBell />` between the theme toggle and the role badge; add `"/messages": "Messaggi"` to `PAGE_TITLES`)

**Interfaces:**
- Consumes: `useInboxSummary`, `useInbox`, `useMarkRead`, `useMarkAllRead`, `bellState`, `formatBadge`, `bellTone`, `bellLabel`, `typeMeta`, `fmtRelativeTime` (`src/lib/format.ts`), `Popover`/`PopoverTrigger`/`PopoverContent` (`src/components/ui/popover.tsx`).
- Produces:
  - `NotificationBell(): JSX.Element | null` (returns `null` without `view:inbox`). A 36 px round button with the lucide `Bell` icon (18 px):
    - empty: muted colour (`--text-muted`), no decoration;
    - read: normal dim colour plus a small green check circle at its corner;
    - unread: soft tinted circle (`--accent-soft`/`--warning-soft`/`--danger-soft`, icon colour `--accent`/`--warning-ink`/`--danger` by `bellTone`), counter badge (`formatBadge`, 2 px border in `--surface`), icon gets class `bell-ring`;
    - unknown (loading or error): the empty look, with no badge.
    The button has `aria-label={bellLabel(summary)}` and `title` with the same text; it is the `PopoverTrigger`.
  - `MessagePanel({ onNavigate }: { onNavigate?: () => void })`: header "Messaggi" with the "Segna tutto come letto" link-button (disabled when `unread === 0`); up to 6 latest items (from `useInbox(DEFAULT_INBOX_FILTERS)` first page) each with severity icon circle, title (bold when unread), one-line body, relative time, and a `next/link` wrapping the row when `link` is set (clicking marks the item read and calls `onNavigate`); empty state text "Nessun messaggio"; footer link "Vedi tutti i messaggi →" to `/messages`.

- [ ] **Step 1: Write failing tests** (mock the hooks; use `src/test/popover-mock.tsx` as other popover tests do): the four visual states by role/label/data-attributes (`data-state="empty|read|unread|unknown"`, `data-tone`), badge text `"3"` and `"9+"`, check mark only in `read`, `aria-label` strings, nothing rendered when `can("view:inbox")` is false, ring class only when unread; panel lists at most 6 items, clicking an item with a link marks it read and calls `onNavigate`, an item without link renders no anchor, "Segna tutto come letto" calls the mutation and is disabled at zero unread, empty state text.
- [ ] **Step 2: Run** `pnpm vitest run src/components/messaging`; expect FAIL.
- [ ] **Step 3: Implement** the components and the Topbar change. Use inline styles with tokens in the same way `Topbar.tsx` does, or Tailwind classes with token-backed utilities, whichever the neighbouring file uses.
- [ ] **Step 4: Run** the tests and `pnpm vitest run src/components/shell`; expect PASS. Run `pnpm lint`.
- [ ] **Step 5: Propose commit** `feat: add notification bell and quick panel`.

---

### Task 4: "Messaggi" page, cards, filters and sidebar entry

**Files:**
- Create: `src/components/messaging/MessageCard.tsx` (+ test), `MessageFilters.tsx` (+ test), `MessagesEmptyState.tsx`, `src/app/(portal)/messages/page.tsx` (+ `page.test.tsx`)
- Modify: `src/components/shell/Sidebar.tsx` (add `badge?: number` to `NavItem` and render it as a small pill next to the label; add the item `{ href: "/messages", label: "Messaggi", icon: Bell, action: "view:inbox" }` to the "Workspace" group after Overview; feed `badge` from `useInboxSummary().data?.unread` when greater than zero), `src/components/shell/Sidebar.test.tsx` (the mocked `apiClient` must answer the summary request)

**Interfaces:**
- Consumes: hooks and helpers from Tasks 1-2, `fmtRelativeTime`, `Chip`-style tokens, `ui/button`, `ui/tabs` where they fit.
- Produces:
  - `MessageCard({ item, onMarkRead }: { item: InboxItem; onMarkRead: (id: string) => void })`: coloured left rail by severity (`--accent`, amber, `--danger`), icon circle (`typeMeta(item.type).icon`, tinted by severity; a green tint with the shield for a passing Quality Gate is optional and out of scope), title with an unread dot and bold weight when `read_at === null`, body, tag with `typeMeta(...).label`, relative time with the absolute time in `title`, a primary link button (`next/link`) shown only when `item.link` is set with the label chosen from the type (`Apri report` for Quality Gate, `Vai agli NRT`, `Apri SANP Health`, otherwise `Apri`), and a quiet "Segna come letto" button shown only for unread items. Read items are visually softened; an `auto_read` item shows the italic note "Sostituito da un avviso più recente" instead of actions.
  - `MessageFilters({ value, onChange, counts })` rendering the segmented control "Tutti / Non letti · N", severity chips (Tutte le severità, Warning, Info, Critical) and type chips (Quality Gate, NRT, SANP Health), updating `InboxFilters`.
  - Page `/messages`: header "Messaggi" with the subtitle "Avvisi e aggiornamenti dai sistemi QA, filtrati per il tuo ruolo." and a "Segna tutto come letto" button; summary chips (non letti, per severity, from `severityCounts` of the loaded items) ; filters; items grouped with `groupByDay(items, new Date())`; "Carica altri" button when `hasNextPage`; loading skeleton cards; error state with retry; `MessagesEmptyState` (green check circle, "Nessun messaggio", one friendly line) when there are no items for the current filters. Follow the permission guard pattern used by `src/app/(portal)/flaky-scenarios/page.tsx` for `view:inbox`.

- [ ] **Step 1: Write failing tests:** card shows rail/dot/bold only when unread, hides the button and shows the note when `auto_read`, renders no anchor without `link`, link label per type, "Segna come letto" calls `onMarkRead(id)`; filters emit the right `InboxFilters` for each control; page (hooks mocked) groups under "Oggi" and "Ieri", shows the empty state, shows a skeleton while loading and a retry on error, calls `fetchNextPage` on "Carica altri", marks all read; sidebar shows the `Messaggi` entry with the pill `3` when `unread` is 3, no pill at 0, and no entry without `view:inbox`.
- [ ] **Step 2: Run** `pnpm vitest run src/components/messaging src/app/\(portal\)/messages src/components/shell`; expect FAIL.
- [ ] **Step 3: Implement.** Match spacing, radii and shadows of the existing pages (`flaky-scenarios`, `releases`).
- [ ] **Step 4: Run** the same command plus `pnpm lint`; expect PASS.
- [ ] **Step 5: Propose commit** `feat: add messages page, cards and sidebar entry`.

---

### Task 5: Integration check, visual verification and docs

**Files:**
- Modify: `README.md` (short section "Messaggi e campanella": where the code lives, the permission `view:inbox`, the interim `X-User-Email` header and why, polling interval)
- Modify: the frontend `CLAUDE.md` if it holds durable per-area rules (add a short "Messaging" note: polling, permission, header)

- [ ] **Step 1: Full checks:** `pnpm lint`, `pnpm test`, `pnpm build`; report exact results.
- [ ] **Step 2: Seed data against a local backend** (backend running on `localhost:8000` with `MESSAGING_INGEST_KEY=dev-key` and the Celery worker and beat or a manual `drain_due()`), then post three events with `curl` to `POST /api/v1/messaging/events` with header `X-Hub-Ingest-Key: dev-key`: a QG run completed with failures, an NRT pending condition with a few run ids, a SANP failing condition with `ko=2, warning=3`. Use the exact envelope and `data` shapes from `pagopa-qa-centralhub-backend/docs/messaging/event-catalog.md`.
- [ ] **Step 3: Verify in the browser** (built-in browser, `pnpm dev`, log in as a user whose role is in the audience): the bell shows the amber unread state with the right count; the panel lists the three messages; a message link navigates to the right page; "Segna come letto" updates bell, panel and page; "Segna tutto come letto" moves the bell to the green-check state; a user with zero messages shows the muted bell; repeat once in dark theme. Compare against the approved mockup and fix visible gaps.
- [ ] **Step 4: Write the README note.**
- [ ] **Step 5: Propose commit** `docs: document the messaging bell and page`, and prepare (do not open) the PR text: context, summary, how tested, deployment order (backend first), follow-ups.

---

## Self-review (spec coverage)

- 5.10 bell states and badge: Tasks 1 and 3; quick panel: Task 3; `/messages` page, filters, grouping, cards, empty state, link buttons: Task 4; sidebar entry with count and `view:inbox` gating: Task 4; polling and focus refetch: Task 2; interim header: Task 2; reduced motion: Task 1 and 3; dark theme: Tasks 1 and 5.
- Types and names used across tasks are defined once in Tasks 1 and 2 (`InboxItem`, `InboxSummary`, `InboxFilters`, `DEFAULT_INBOX_FILTERS`, `bellState`, `formatBadge`, `bellTone`, `bellLabel`, `groupByDay`, `severityCounts`, `typeMeta`).
