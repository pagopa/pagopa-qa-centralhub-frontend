import { initials } from "@/lib/initials";

/** A person as a small circle with initials next to the name (the name truncates, never overflows). */
export function PersonChip({ name, label }: { name: string; label?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-[14px] text-text">
      {label && <span className="sr-only">{label}</span>}
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-medium text-text-dim"
        style={{ background: "var(--neutral-soft)" }}
      >
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}
