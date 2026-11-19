import {
  ArrowDown,
  ArrowUp,
  CircleCheck,
  Clock,
  CloudOff,
  Equal,
  Info,
  PencilLine,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ChangePopover } from "@/components/release-status/ChangePopover";
import { useApplicationDetail } from "@/hooks/useReleaseStatus";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime } from "@/components/release-status/format";
import { cellVisual, type CellIcon, type CellVisual } from "@/lib/release-status";
import type { Cell, ChangeSummary, Target } from "@/types/release-status";

const STATUS_ICON: Record<CellIcon, { icon: LucideIcon; label: string; color: string }> = {
  loading: { icon: Clock, label: "in attesa del primo controllo", color: "text-text-muted" },
  ok: { icon: CircleCheck, label: "versione letta", color: "text-accent" },
  error: { icon: CloudOff, label: "endpoint non raggiungibile", color: "text-danger" },
  warning: { icon: TriangleAlert, label: "versione non disponibile", color: "text-warning" },
  manual: { icon: PencilLine, label: "versione inserita a mano", color: "text-info" },
  info: { icon: Info, label: "versione non standard", color: "text-warning" },
};

const DRIFT_ICON: Record<NonNullable<CellVisual["drift"]>, { icon: LucideIcon; label: string; color: string }> = {
  equal: { icon: Equal, label: "allineata al repository", color: "text-text-dim" },
  behind: { icon: ArrowDown, label: "indietro rispetto al repository", color: "text-warning" },
  ahead: { icon: ArrowUp, label: "avanti rispetto al repository", color: "text-danger" },
};

/**
 * Version text that is a focusable trigger for the change popover of the latest deploy. The detail is
 * loaded lazily, only once the version is hovered, focused or clicked.
 */
function ChangeableVersion({
  applicationId,
  target,
  version,
  children,
}: {
  applicationId?: string;
  target: Target;
  version: string | null;
  children: ReactNode;
}) {
  if (!applicationId || !version) return <>{children}</>;
  return (
    <LazyChangeVersion applicationId={applicationId} target={target} version={version}>
      {children}
    </LazyChangeVersion>
  );
}

function LazyChangeVersion({
  applicationId,
  target,
  version,
  children,
}: {
  applicationId: string;
  target: Target;
  version: string;
  children: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  const { data, isError } = useApplicationDetail(armed ? applicationId : null);

  const latest = data?.history[target]?.[0];
  let changes: ChangeSummary | null;
  let from = "";
  if (isError) {
    changes = { status: "ERROR", direction: null, items: [], total_commits: 0, truncated: false, compare_url: null };
  } else if (!data) {
    changes = { status: "PENDING", direction: null, items: [], total_commits: 0, truncated: false, compare_url: null };
  } else if (latest && latest.version === version && latest.previous_version && latest.changes) {
    changes = latest.changes;
    from = latest.previous_version;
  } else {
    changes = null;
  }
  return (
    <ChangePopover
      fromVersion={from}
      toVersion={version}
      changes={changes}
      inert={changes === null}
      onArm={() => setArmed(true)}
    >
      {children}
    </ChangePopover>
  );
}

interface VersionCellProps {
  target: Target;
  /** When set, hovering or focusing the version loads the latest deploy's change summary. */
  applicationId?: string;
  cell: Cell | null;
  /** Icons on a first line and the full version below, as on the old status page. */
  stacked?: boolean;
  /** Rendered next to the icons in the stacked layout (e.g. the test markers). */
  adornment?: ReactNode;
}

/** Icon, version and drift arrow of one target, with the full read detail in a tooltip. */
export function VersionCell({ target, applicationId, cell, stacked = false, adornment }: VersionCellProps) {
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
        <ChangeableVersion applicationId={applicationId} target={target} version={version}>
          <span className={`max-w-full break-all font-mono text-[13px] leading-tight tabular-nums ${versionClass}`}>
            {version ?? "—"}
          </span>
        </ChangeableVersion>
      </div>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger
          render={
            <span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {statusIcon}
            </span>
          }
        />
        {details}
      </Tooltip>
      <ChangeableVersion applicationId={applicationId} target={target} version={version}>
        <span className={`truncate font-mono text-[13px] tabular-nums ${versionClass}`}>{version ?? "—"}</span>
      </ChangeableVersion>
      {driftIcon}
    </span>
  );
}
