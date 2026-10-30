"use client";

import Link from "next/link";
import { useJiraOverview } from "@/hooks/useJira";
import { useGpdPositionSnapshots } from "@/hooks/useGpdPositions";
import { Kpi } from "@/components/primitives/Kpi";
import { fmtNumberIt } from "@/lib/format";
import { LayoutGrid, FileText, Sparkles, ArrowRight, CreditCard, BookOpen, Wallet, ShieldCheck, Network } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function GpdPositionsStatusCard() {
  const { data, isLoading } = useGpdPositionSnapshots();

  if (isLoading) return <Kpi label="Posizioni GPD" value="—" />;

  const items = data?.items ?? [];
  const latest = items.length > 0 ? items[items.length - 1] : null;
  const previous = items.length > 1 ? items[items.length - 2] : null;

  if (!latest) return <Kpi label="Posizioni GPD" value="—" />;

  const delta =
    previous && previous.total !== 0
      ? Math.round(((latest.total - previous.total) / previous.total) * 1000) / 10
      : undefined;

  return (
    <Link href="/data-hub/gpd-positions" className="no-underline">
      <Kpi label="Posizioni GPD" value={fmtNumberIt(latest.total)} delta={delta} />
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
    href: "/ea-map",
    icon: Network,
    label: "Architettura",
    description: "Mappa EA della piattaforma pagamenti: blueprint, prodotti, componenti, dipendenze e copertura dei test.",
    color: "var(--accent)",
    bg: "var(--accent-soft)",
  },
  {
    href: "/bdd",
    icon: Sparkles,
    label: "Gherkin Generator",
    description: "Genera scenari BDD da requisiti Confluence, PDF o testo libero con AI (Ollama o Claude).",
    color: "var(--warning)",
    bg: "color-mix(in oklch, var(--warning) 10%, transparent)",
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
    href: "/data-hub/psp-fees",
    icon: CreditCard,
    label: "PSP Commissioni",
    description: "Catalogo PSP/servizi pagoPA AFM: commissioni, soglie e canali, sincronizzato giornalmente.",
    color: "var(--danger)",
    bg: "color-mix(in oklch, var(--danger) 10%, transparent)",
  },
  {
    href: "/data-hub/gpd-positions",
    icon: Wallet,
    label: "Posizioni Debitorie GPD",
    description: "Andamento delle Posizioni Debitorie GPD, GPD4ACA, WISP e paCreatePosition, sincronizzato giornalmente.",
    color: "var(--success)",
    bg: "color-mix(in oklch, var(--success) 10%, transparent)",
  },
  {
    href: "/data-quality/catalog",
    icon: ShieldCheck,
    label: "Data Quality",
    description: "Catalogo controlli e istanze per dominio: dimensioni, rischio, impatto e stato di implementazione.",
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
    href: `${API_BASE_URL}/api/v1/docs`,
    icon: BookOpen,
    label: "API Docs",
    description: "Documentazione interattiva (Swagger UI) delle API del backend QA Hub.",
    color: "var(--info)",
    bg: "color-mix(in oklch, var(--info) 10%, transparent)",
    external: true,
  },
];


export default function OverviewPage() {
  return (
    <RouteGuard action="view:overview">
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
              &quot;Build Quality Together!&quot;
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <JiraStatusCard />
            <GpdPositionsStatusCard />
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
            Strategie di test, KPI di stabilità, report Allure e integrazione CI/CD.
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
            const content = (
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
            );

            if (tile.external) {
              return (
                <a
                  key={tile.href}
                  href={tile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline group"
                >
                  {content}
                </a>
              );
            }

            return (
              <Link key={tile.href} href={tile.href} className="no-underline group">
                {content}
              </Link>
            );
          })}
        </div>
      </div>

    </div>
    </RouteGuard>
  );
}
