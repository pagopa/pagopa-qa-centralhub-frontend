import { CircleCheck, CloudOff, FlaskConical, LayoutGrid, RefreshCwOff, type LucideIcon } from "lucide-react";
import { Kpi } from "@/components/primitives/Kpi";
import type { ApplicationRow, StatusFilter } from "@/types/release-status";

type KpiStatus = "success" | "warning" | "danger" | "info";

interface KpiDef {
  label: string;
  value: number;
  icon: LucideIcon;
  status?: KpiStatus;
  filter: StatusFilter | null;
}

const ICON_TONE: Record<KpiStatus | "neutral", string> = {
  neutral: "bg-neutral-soft text-text-dim",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

function KpiIcon({ icon: Icon, status }: { icon: LucideIcon; status?: KpiStatus }) {
  return (
    <span className={`flex size-8 items-center justify-center rounded-full ${ICON_TONE[status ?? "neutral"]}`}>
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

interface ReleaseKpisProps {
  applications: ApplicationRow[];
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

/** KPI strip of the active area; each counter (except "allineati") applies its filter. */
export function ReleaseKpis({ applications, filter, onFilterChange }: ReleaseKpisProps) {
  const count = (flag: ApplicationRow["flags"][number]) =>
    applications.filter((app) => app.flags.includes(flag)).length;

  const kpis: KpiDef[] = [
    { label: "servizi", value: applications.length, icon: LayoutGrid, filter: "all" },
    { label: "allineati", value: count("ALIGNED"), icon: CircleCheck, status: "success", filter: null },
    { label: "con versioni diverse", value: count("DRIFT"), icon: RefreshCwOff, status: "warning", filter: "drift" },
    { label: "non raggiungibili", value: count("UNREACHABLE"), icon: CloudOff, status: "danger", filter: "unreachable" },
    { label: "non testati", value: count("UNTESTED"), icon: FlaskConical, status: "info", filter: "untested" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const card = (
          <Kpi label={kpi.label} value={kpi.value} status={kpi.value > 0 ? kpi.status : undefined}>
            <KpiIcon icon={kpi.icon} status={kpi.status} />
          </Kpi>
        );
        if (kpi.filter === null) return <div key={kpi.label}>{card}</div>;

        const active = filter === kpi.filter;
        return (
          <button
            key={kpi.label}
            type="button"
            aria-label={`${kpi.label}: ${kpi.value}`}
            aria-pressed={active}
            onClick={() => onFilterChange(kpi.filter as StatusFilter)}
            className={`rounded-[var(--radius)] text-left outline-none transition duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-accent ${
              active ? "ring-2 ring-accent/60" : ""
            }`}
          >
            {card}
          </button>
        );
      })}
    </div>
  );
}
