import Link from "next/link";
import type { ReactNode } from "react";

export function OverviewKpi({
  href,
  label,
  value,
  valueColor = "var(--text)",
  children,
}: {
  href: string;
  label: string;
  value: string;
  valueColor?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      data-kpi
      className="flex min-w-44 flex-1 flex-col gap-0.5 rounded-xl border border-border bg-bg px-4 py-3 no-underline transition-colors hover:border-border-strong hover:bg-surface"
    >
      <span className="text-[12.5px] font-medium text-text-dim">{label}</span>
      <span className="text-[30px] leading-tight font-bold tracking-tight tabular-nums" style={{ color: valueColor }}>
        {value}
      </span>
      {children}
    </Link>
  );
}
