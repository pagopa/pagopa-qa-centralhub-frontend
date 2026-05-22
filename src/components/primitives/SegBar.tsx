type SegBarProps = {
  passed: number;
  failed: number;
  flaky?: number;
  skipped?: number;
  height?: number;
};

export function SegBar({ passed, failed, flaky = 0, skipped = 0, height = 6 }: SegBarProps) {
  const total = passed + failed + flaky + skipped || 1;
  const pct = (v: number) => `${((v / total) * 100).toFixed(1)}%`;

  return (
    <div
      className="flex w-full overflow-hidden rounded-full"
      style={{ height, background: "var(--neutral-soft)" }}
      title={`passed: ${passed}  failed: ${failed}  flaky: ${flaky}  skipped: ${skipped}`}
    >
      {passed  > 0 && <div style={{ width: pct(passed),  background: "var(--success)" }} />}
      {failed  > 0 && <div style={{ width: pct(failed),  background: "var(--danger)" }} />}
      {flaky   > 0 && <div style={{ width: pct(flaky),   background: "var(--warning)" }} />}
      {skipped > 0 && <div style={{ width: pct(skipped), background: "var(--text-muted)" }} />}
    </div>
  );
}
