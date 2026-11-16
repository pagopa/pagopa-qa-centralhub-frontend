"use client";

import { Database, FlaskConical, Target } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { OverviewKpi } from "@/components/overview/OverviewKpi";
import { OverviewPillar } from "@/components/overview/OverviewPillar";
import {
  COMPETENCE_CENTRE_SECTIONS,
  DATA_QUALITY_SECTIONS,
  TESTING_SECTIONS,
  useVisibleSections,
} from "@/components/overview/sections";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { useReleaseSummary } from "@/hooks/useReleaseStatus";
import { useGpdPositionSnapshots } from "@/hooks/useGpdPositions";
import { useJiraOverview } from "@/hooks/useJira";
import { useNrtsAvgPassRate, usePendingRuns } from "@/hooks/useNrts";
import { fmtNumberIt } from "@/lib/format";

const NO_VALUE = "—";

function passRateColor(passRate: number): string {
  if (passRate >= 80) return "var(--success)";
  if (passRate >= 50) return "var(--warning)";
  return "var(--danger)";
}

function JiraIssuesKpi() {
  const { data, isLoading } = useJiraOverview();
  const total = data?.total;
  const blocked = data?.by_status.find((status) => status.name === "BLOCKED")?.count ?? 0;
  return (
    <OverviewKpi
      href="/jira"
      label="Issue attive"
      value={isLoading || total == null ? NO_VALUE : total.toString()}
      valueColor={blocked > 0 ? "var(--warning)" : "var(--success)"}
    >
      {blocked > 0 && <span className="text-[12px] font-medium text-warning">{blocked} bloccate</span>}
    </OverviewKpi>
  );
}

function PassRateKpi() {
  const { data, isLoading } = useNrtsAvgPassRate();
  const passRate = isLoading ? undefined : data;
  return (
    <OverviewKpi
      href="/nrts"
      label="Pass rate medio NRT"
      value={passRate == null ? NO_VALUE : `${passRate}%`}
      valueColor={passRate == null ? "var(--text)" : passRateColor(passRate)}
    >
      {passRate != null && (
        <span className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-soft">
          <span className="block h-full rounded-full" style={{ width: `${Math.min(100, passRate)}%`, background: passRateColor(passRate) }} />
        </span>
      )}
    </OverviewKpi>
  );
}

function PendingRunsKpi() {
  const { data, isLoading } = usePendingRuns();
  const pending = isLoading ? undefined : data;
  // Open the list that actually has runs waiting: the Quality Gate when only QG runs are pending.
  const href = pending && pending.nrt === 0 && pending.qg > 0 ? "/quality-gate" : "/nrts";
  return (
    <OverviewKpi
      href={href}
      label="Run da analizzare"
      value={pending ? pending.total.toString() : NO_VALUE}
      valueColor={pending && pending.total > 0 ? "var(--warning)" : "var(--success)"}
    >
      {pending && pending.total > 0 && (
        <span className="mt-1 flex gap-1.5">
          <span className="rounded-full bg-warning-soft px-2 text-[11.5px] font-semibold text-warning">NRT {pending.nrt}</span>
          <span className="rounded-full bg-warning-soft px-2 text-[11.5px] font-semibold text-warning">QG {pending.qg}</span>
        </span>
      )}
    </OverviewKpi>
  );
}

function ReleaseStatusKpi() {
  const { can } = usePermissions();
  // Gate before fetching: users without the permission must not request the summary.
  if (!can("view:status_page")) return null;
  return <ReleaseStatusKpiContent />;
}

function ReleaseStatusKpiContent() {
  const { data, isLoading } = useReleaseSummary();
  const summary = isLoading ? undefined : data;
  const links = summary
    ? [
        { count: summary.drift, text: "con versioni diverse", filter: "drift", color: "text-warning" },
        { count: summary.unreachable, text: "non raggiungibili", filter: "unreachable", color: "text-danger" },
        { count: summary.untested, text: "non testati", filter: "untested", color: "text-text-dim" },
      ]
    : [];
  // The counts are links of their own, so they sit beside the tile link instead of inside it (no nested anchors).
  return (
    <div className="flex min-w-44 flex-1 flex-col gap-1.5">
      <OverviewKpi
        href="/releases"
        label="Release allineate"
        value={summary ? `${summary.aligned}/${summary.total}` : NO_VALUE}
        valueColor={summary && summary.aligned === summary.total ? "var(--success)" : "var(--text)"}
      />
      {links.length > 0 && (
        <div className="flex flex-col gap-0.5 px-1">
          {links.map((item) => (
            <Link
              key={item.filter}
              href={`/releases?filter=${item.filter}`}
              className={`text-[12px] font-medium no-underline hover:underline ${item.color}`}
            >
              {item.count} {item.text}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function GpdPositionsKpi() {
  const { data, isLoading } = useGpdPositionSnapshots();
  const items = data?.items ?? [];
  const latest = isLoading ? undefined : items.at(-1);
  const previous = items.length > 1 ? items.at(-2) : undefined;
  const delta = latest && previous && previous.total !== 0
    ? Math.round(((latest.total - previous.total) / previous.total) * 1000) / 10
    : undefined;
  return (
    <OverviewKpi href="/data-hub/gpd-positions" label="Posizioni Debitorie GPD" value={latest ? fmtNumberIt(latest.total) : NO_VALUE}>
      {delta !== undefined && (
        <span className="text-[12px] text-text-dim">
          <span className={`font-semibold ${delta >= 0 ? "text-success" : "text-danger"}`}>
            {delta > 0 ? "+" : ""}{delta.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </span>{" "}
          rispetto allo snapshot precedente
        </span>
      )}
    </OverviewKpi>
  );
}

export default function OverviewPage() {
  const competenceCentreSections = useVisibleSections(COMPETENCE_CENTRE_SECTIONS);
  const testingSections = useVisibleSections(TESTING_SECTIONS);
  const dataQualitySections = useVisibleSections(DATA_QUALITY_SECTIONS);

  return (
    <RouteGuard action="view:overview">
      <div className="flex flex-col gap-5">
        <OverviewPillar
          title="Centro di Competenza QA"
          headingLevel={1}
          eyebrow="TS300 · Dipartimento Pagamenti"
          icon={Target}
          color="var(--accent)"
          softColor="var(--accent-soft)"
          kpis={<JiraIssuesKpi />}
          sections={competenceCentreSections}
          sectionColumns={4}
        >
          <p className="text-[14px] text-accent italic">&quot;Build Quality Together!&quot;</p>
          <p className="mt-1 text-[14px] leading-relaxed text-text-dim">
            Il CC QA supporta i team del Dipartimento Pagamenti di pagoPA nel costruire software di qualità.
            Due pilastri, <strong className="text-text">Testing</strong> e <strong className="text-text">Data Quality</strong>,
            e un approccio trasversale che unisce engineering, processi e cultura.
          </p>
        </OverviewPillar>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <OverviewPillar
            title="Testing"
            icon={FlaskConical}
            color="var(--success)"
            softColor="var(--success-soft)"
            kpis={<><PassRateKpi /><PendingRunsKpi /><ReleaseStatusKpi /></>}
            sections={testingSections}
          >
            <p className="text-[14px] text-text-dim">Strategie di test, KPI di stabilità, report Allure e integrazione CI/CD.</p>
          </OverviewPillar>
          <OverviewPillar
            title="Data Quality"
            icon={Database}
            color="var(--info)"
            softColor="var(--info-soft)"
            kpis={<GpdPositionsKpi />}
            sections={dataQualitySections}
          >
            <p className="text-[14px] text-text-dim">Monitoraggio della qualità dei dati, regole di validazione, metriche e governance dei dataset.</p>
          </OverviewPillar>
        </div>
      </div>
    </RouteGuard>
  );
}
