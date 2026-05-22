# QA Hub — Frontend

Next.js 14+ App Router frontend for QA Hub — internal portal for Testing & Data Quality.

## Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- Backend running at `http://localhost:8000` (see `../qa-hub-backend/`)

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in OIDC values
pnpm dev
```

Open http://localhost:3000.

## Build

```bash
pnpm build && pnpm start
```

## Project structure

```
src/
├── app/
│   ├── (portal)/           ← Authenticated portal shell + all pages
│   │   ├── layout.tsx      ← Sidebar + Topbar grid
│   │   ├── page.tsx        ← Overview
│   │   ├── dashboards/
│   │   ├── e2e/
│   │   ├── coverage/
│   │   ├── perf/
│   │   ├── jira/
│   │   ├── bugs/
│   │   ├── releases/
│   │   ├── docs/
│   │   └── settings/
│   └── api/auth/           ← Auth.js route handler
├── components/
│   ├── shell/              ← Sidebar, Topbar
│   ├── primitives/         ← Kpi, Sparkline, Chip, SegBar, BrandMark
│   └── ui/                 ← shadcn/ui components
├── lib/
│   ├── api.ts              ← Typed fetch client
│   ├── auth.ts             ← Auth.js config
│   ├── permissions.ts      ← can(role, action) + <Gate>
│   └── format.ts           ← fmtDuration, fmtRelativeTime, ...
└── types/index.ts          ← Domain types (replaced by OpenAPI gen later)
```

## Design system

Tokens live in `src/app/globals.css`. See `../design_handoff_qa_webportal/README.md` for full reference.
