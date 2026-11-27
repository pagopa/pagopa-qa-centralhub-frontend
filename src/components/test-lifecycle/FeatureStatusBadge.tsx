import { FEATURE_STATUS_COLOR, FEATURE_STATUS_LABEL } from "@/lib/test-lifecycle";
import type { TlFeatureStatus } from "@/types/test-lifecycle";

function Pill({ status }: { status: TlFeatureStatus }) {
  const s = FEATURE_STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-[5px] font-mono rounded-full whitespace-nowrap"
      style={{ fontSize: 11, padding: "2px 8px", color: s.color, background: s.bg }}
    >
      <span className="inline-block rounded-full shrink-0" style={{ width: 6, height: 6, background: s.color }} />
      {FEATURE_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The status shown for a feature. "In esecuzione NRT" is not a phase: when NRT runs the feature it
 * is an extra badge next to the status, whatever that status is.
 */
export function FeatureStatusBadge({ status, running = false }: { status: TlFeatureStatus; running?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Pill status={status} />
      {running && <Pill status="running" />}
    </span>
  );
}
