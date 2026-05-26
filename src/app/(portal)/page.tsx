"use client";

import Link from "next/link";
import { useE2eSuites } from "@/hooks/useE2eSuites";
import { useJiraOverview } from "@/hooks/useJira";
import { Kpi } from "@/components/primitives/Kpi";
import { TestTube2, LayoutGrid, FileText, Settings, Sparkles, ArrowRight } from "lucide-react";

function E2eStatusCard() {
  const { data, isLoading } = useE2eSuites();

  if (isLoading) return <Kpi label="E2E Status" value="—" />;

  const total = data?.length ?? 0;
  const failing = data?.filter((s) => s.latest_run?.status === "failed").length ?? 0;
  const passRate = total > 0 ? Math.round(((total - failing) / total) * 100) : null;
  const status = failing === 0 ? "success" : failing / total > 0.5 ? "danger" : "warning";

  return (
    <Link href="/e2e" className="no-underline">
      <Kpi label="Suite status" value={passRate !== null ? `${passRate}%` : "—"} status={status}>
        {failing > 0 && (
          <span className="text-danger font-mono text-[11px]">{failing}/{total} fallite</span>
        )}
      </Kpi>
    </Link>
  );
}

function JiraStatusCard() {
  const { data, isLoading } = useJiraOverview();

  if (isLoading) return <Kpi label="Jira Issues" value="—" />;

  const total = data?.total ?? 0;
  const blocked = data?.by_status.find((s) => s.name === "BLOCKED")?.count ?? 0;
  const status = blocked > 0 ? "warning" : total > 0 ? "success" : "info";

  return (
    <Link href="/jira" className="no-underline">
      <Kpi label="Issue attive" value={total.toString()} status={status}>
        {blocked > 0 && (
          <span className="text-warning font-mono text-[11px]">{blocked} bloccate</span>
        )}
      </Kpi>
    </Link>
  );
}

const NAV_TILES = [
  {
    href: "/bdd",
    icon: Sparkles,
    label: "Gherkin Generator",
    description: "Genera scenari BDD da requisiti Confluence, PDF o testo libero con AI (Ollama o Claude).",
    color: "var(--warning)",
    bg: "color-mix(in oklch, var(--warning) 10%, transparent)",
  },
  {
    href: "/e2e",
    icon: TestTube2,
    label: "E2E Test Results",
    description: "Esplora run, suite e trend di stabilità dei test end-to-end.",
    color: "var(--accent)",
    bg: "var(--accent-soft)",
  },
  {
    href: "/jira",
    icon: LayoutGrid,
    label: "KPI Jira",
    description: "Monitora issue per status, componente e fase. Alert e trend settimanale.",
    color: "var(--info)",
    bg: "color-mix(in oklch, var(--info) 10%, transparent)",
  },
  {
    href: "/docs",
    icon: FileText,
    label: "Docs & Decks",
    description: "Knowledge base del centro di competenza: guide, template e presentazioni.",
    color: "var(--success)",
    bg: "color-mix(in oklch, var(--success) 10%, transparent)",
  },
  {
    href: "/settings/integrations",
    icon: Settings,
    label: "Settings",
    description: "Configura le integrazioni: suite E2E, GitHub repo e intervalli di sincronizzazione.",
    color: "var(--text-muted)",
    bg: "var(--subtle)",
  },
];


export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-8">

      {/* Hero */}
      <div className="rounded-[var(--radius)] border border-border bg-surface p-6 flex flex-col gap-3">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase text-text-muted" style={{ letterSpacing: ".08em" }}>
                TS300 · Dipartimento Pagamenti
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-text" style={{ letterSpacing: "-0.02em" }}>
              Centro di Competenza QA
            </h1>
            <p className="text-[13px] text-text-dim italic" style={{ color: "var(--accent)" }}>
              "Build Quality Together!"
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <E2eStatusCard />
            <JiraStatusCard />
          </div>
        </div>
        <p className="text-[13px] text-text-dim max-w-2xl">
          Il CC QA supporta i team del Dipartimento Pagamenti di pagoPA nel costruire software di qualità.
          Due pilastri — <strong className="text-text">Testing</strong> e <strong className="text-text">Data Quality</strong> —
          e un approccio trasversale che unisce engineering, processi e cultura.
        </p>
      </div>

      {/* Two pillars */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5 flex flex-col gap-2">
          <div className="text-2xl">🧪</div>
          <p className="font-semibold text-[14px] text-text">Testing</p>
          <p className="text-[12px] text-text-dim">
            Test automation E2E, strategie di test, KPI di stabilità, allure reports, integrazione CI/CD.
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5 flex flex-col gap-2">
          <div className="text-2xl">🗃️</div>
          <p className="font-semibold text-[14px] text-text">Data Quality</p>
          <p className="text-[12px] text-text-dim">
            Monitoraggio della qualità dei dati, regole di validazione, metriche e governance dei dataset.
          </p>
        </div>
      </div>

      {/* Nav tiles */}
      <div>
        <p className="text-[12px] font-mono uppercase text-text-muted mb-3" style={{ letterSpacing: ".08em" }}>Sezioni</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {NAV_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.href} href={tile.href} className="no-underline group">
                <div className="rounded-[var(--radius)] border border-border bg-surface p-4 flex flex-col gap-3 h-full transition-colors hover:bg-hover">
                  <div
                    className="w-8 h-8 rounded-[var(--radius-sm)] grid place-items-center shrink-0"
                    style={{ background: tile.bg }}
                  >
                    <Icon size={16} style={{ color: tile.color }} strokeWidth={1.8} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <p className="font-semibold text-[13px] text-text">{tile.label}</p>
                    <p className="text-[12px] text-text-dim">{tile.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] font-medium" style={{ color: tile.color }}>
                    Apri <ArrowRight size={12} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
