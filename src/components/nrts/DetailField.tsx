import type { ReactNode } from "react";

export function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-text-dim">{label}</dt>
      <dd className={`mt-0.5 break-words text-text ${mono ? "font-mono text-[13px]" : "text-[14px] font-medium"}`}>
        {value || "—"}
      </dd>
    </div>
  );
}
