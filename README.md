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
│   │   ├── bdd/            ← Gherkin Generator (projects, scenarios, history)
│   │   │   ├── page.tsx             Project list
│   │   │   ├── history/             All-project history
│   │   │   └── [id]/
│   │   │       ├── page.tsx         Scenario list for a project
│   │   │       └── new/page.tsx     Generate wizard (3-step SSE)
│   │   ├── e2e/            ← Suite list, run table (bulk delete), Allure modal
│   │   ├── jira/           ← 3 sezioni (Testing / SANP / Data), Monitoraggio + Insights
│   │   ├── docs/           ← Knowledge base (tile CRUD, HTML proxy iframe)
│   │   ├── coverage/
│   │   ├── releases/
│   │   └── settings/
│   │       ├── integrations/        E2E suite config
│   │       ├── bdd/                 Gherkin Generator config (AI provider, Confluence, Ollama)
│   │       ├── general/
│   │       ├── team/
│   │       └── notifications/
│   └── api/auth/           ← Auth.js route handler
├── components/
│   ├── shell/              ← Sidebar, Topbar
│   ├── primitives/         ← Kpi, Sparkline, Chip, SegBar, BrandMark
│   └── ui/                 ← shadcn/ui components
├── hooks/
│   ├── useBdd.ts           ← BDD settings, projects, scenarios, generate, Ollama
│   ├── useE2eSuites.ts     ← suite list, run table, delete (single + bulk)
│   ├── useJira.ts          ← useJiraOverview/Trend, useJiraSanpOverview/Trend, useJiraDataOverview/Trend
│   └── ...
├── lib/
│   ├── api.ts              ← Typed fetch client
│   ├── auth.ts             ← Auth.js config
│   ├── permissions.ts      ← can(role, action) + <Gate>
│   └── format.ts           ← fmtDuration, fmtRelativeTime, ...
└── types/index.ts          ← Domain types (replaced by OpenAPI gen later)
```

## Design system

Tokens live in `src/app/globals.css`. See `../design_handoff_qa_webportal/README.md` for full reference.
