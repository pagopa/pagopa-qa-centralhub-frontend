import {
  ArrowDown,
  ArrowUp,
  CircleCheck,
  Clock,
  CloudOff,
  Equal,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime } from "@/components/release-status/format";
import { cellVisual, type CellIcon, type CellVisual } from "@/lib/release-status";
import type { Cell, Target } from "@/types/release-status";

const STATUS_ICON: Record<CellIcon, { icon: LucideIcon; label: string; color: string }> = {
  loading: { icon: Clock, label: "in attesa del primo controllo", color: "text-text-muted" },
  ok: { icon: CircleCheck, label: "versione letta", color: "text-accent" },
  error: { icon: CloudOff, label: "endpoint non raggiungibile", color: "text-danger" },
  warning: { icon: TriangleAlert, label: "versione non disponibile", color: "text-warning" },
  info: { icon: Info, label: "versione non standard", color: "text-warning" },
};

const DRIFT_ICON: Record<NonNullable<CellVisual["drift"]>, { icon: LucideIcon; label: string; color: string }> = {
  equal: { icon: Equal, label: "allineata al repository", color: "text-text-dim" },
  behind: { icon: ArrowDown, label: "indietro rispetto al repository", color: "text-warning" },
  ahead: { icon: ArrowUp, label: "avanti rispetto al repository", color: "text-danger" },
};

interface VersionCellProps {
  target: Target;
  cell: Cell | null;
  /** Icons on a first line and the full version below, as on the old status page. */
  stacked?: boolean;
  /** Rendered next to the icons in the stacked layout (e.g. the test markers). */
  adornment?: ReactNode;
}

/** Icon, version and drift arrow of one target, with the full read detail in a tooltip. */
export function VersionCell({ target, cell, stacked = false, adornment }: VersionCellProps) {
  const visual = cellVisual(cell, target);
  const status = STATUS_ICON[visual.icon];
  const StatusIcon = status.icon;
  const drift = visual.drift ? DRIFT_ICON[visual.drift] : null;
  const DriftIcon = drift?.icon;
  const version = cell?.version ?? null;

  const versionClass = visual.muted ? "text-text-muted" : version ? "font-medium text-text" : "text-text-muted";
  const statusIcon = (
    <StatusIcon role="img" aria-label={status.label} className={`size-4 shrink-0 ${status.color}`} />
  );
  const driftIcon = drift && DriftIcon && (
    <DriftIcon role="img" aria-label={drift.label} className={`size-3.5 shrink-0 ${drift.color}`} />
  );
  const details = (
    <TooltipContent className="flex-col items-start gap-0.5">
      <span className="font-medium">{visual.tooltip}</span>
      {cell?.version_since && <span>In {target} dal {formatDateTime(cell.version_since)}</span>}
      {cell && <span>Ultimo controllo {formatDateTime(cell.checked_at)}</span>}
      {cell?.read_status === "ERROR" && cell.last_ok_at && (
        <span>Ultima lettura riuscita {formatDateTime(cell.last_ok_at)}</span>
      )}
    </TooltipContent>
  );

  if (stacked) {
    return (
      <div className="flex min-w-0 flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className="inline-flex items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {statusIcon}
                  {driftIcon}
                </span>
              }
            />
            {details}
          </Tooltip>
          {adornment}
        </div>
        <span className={`max-w-full break-all font-mono text-[13px] leading-tight tabular-nums ${versionClass}`}>
          {version ?? "—"}
        </span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {statusIcon}
            <span className={`truncate font-mono text-[13px] tabular-nums ${versionClass}`}>{version ?? "—"}</span>
            {driftIcon}
          </span>
        }
      />
      {details}
    </Tooltip>
  );
}
