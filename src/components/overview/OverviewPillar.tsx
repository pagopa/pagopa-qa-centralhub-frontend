import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { OverviewSection } from "./sections";

export function OverviewPillar({
  title,
  headingLevel = 2,
  eyebrow,
  icon: Icon,
  color,
  softColor,
  children,
  kpis,
  sections,
  sectionColumns = 1,
}: {
  title: string;
  headingLevel?: 1 | 2;
  eyebrow?: string;
  icon: LucideIcon;
  color: string;
  softColor: string;
  children?: ReactNode;
  kpis: ReactNode;
  sections: OverviewSection[];
  sectionColumns?: 1 | 4;
}) {
  const headingId = useId();
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section
      aria-labelledby={headingId}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="flex flex-wrap items-start justify-between gap-5 px-6 pt-6 pb-5">
        <div className="flex max-w-2xl items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: softColor, color }}>
            <Icon size={22} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            {eyebrow && (
              <span className="font-mono text-[11px] tracking-[.08em] text-text-dim uppercase">{eyebrow}</span>
            )}
            <Heading
              id={headingId}
              className={`font-semibold tracking-tight text-text ${headingLevel === 1 ? "text-[26px]" : "text-[20px]"}`}
            >
              {title}
            </Heading>
            {children}
          </div>
        </div>
        {headingLevel === 1 && <div className="flex flex-wrap gap-3">{kpis}</div>}
      </div>
      {headingLevel !== 1 && <div className="flex flex-wrap gap-3 px-6 pb-5">{kpis}</div>}
      {sections.length > 0 && (
        <div className="mt-auto border-t border-border bg-bg/60 px-4 pt-3 pb-4">
          <p className="mx-2 mb-2.5 text-[11px] font-semibold tracking-[.08em] text-text-dim uppercase">Sezioni</p>
          <div className={`grid gap-2.5 ${sectionColumns === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-1"}`}>
            {sections.map((section) => (
              <SectionTile key={section.href} section={section} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SectionTile({ section }: { section: OverviewSection }) {
  const Icon = section.icon;
  return (
    <Link
      href={section.href}
      data-section={section.href}
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3 no-underline transition-all hover:-translate-y-px hover:shadow-md"
      style={{ ["--tile-color" as string]: section.color }}
    >
      <span className="grid size-[34px] shrink-0 place-items-center rounded-lg" style={{ background: section.softColor, color: section.color }}>
        <Icon size={17} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[14.5px] font-semibold text-text">
          {section.label}
          {section.badge && (
            <span className="rounded bg-accent px-1.5 text-[10px] font-bold text-accent-fg">{section.badge}</span>
          )}
        </span>
        <span className="text-[13px] leading-snug text-text-dim">{section.description}</span>
      </span>
      <ArrowRight
        size={16}
        aria-hidden
        className="ml-auto shrink-0 self-center text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--tile-color)]"
      />
    </Link>
  );
}
