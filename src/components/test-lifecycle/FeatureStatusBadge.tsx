import { FEATURE_STATUS_COLOR, FEATURE_STATUS_LABEL } from "@/lib/test-lifecycle";
import type { TlFeatureStatus } from "@/types/test-lifecycle";

export function FeatureStatusBadge({ status }: { status: TlFeatureStatus }) {
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
