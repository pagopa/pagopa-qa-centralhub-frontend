import type { CSSProperties } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { AreaTone, NavItem } from "./nav-config";

/** Exposes the area colours of a tone as `--area` / `--area-soft` for the subtree. */
export function areaStyle(tone: AreaTone): CSSProperties {
  return {
    "--area": `var(--area-${tone})`,
    "--area-soft": `var(--area-${tone}-soft)`,
  } as CSSProperties;
}

interface NavItemLinkProps {
  item: NavItem;
  /** Resolved target; external entries with an empty href render as disabled text. */
  href: string;
  tone: AreaTone;
  active: boolean;
  /** Icon-only mode. */
  rail: boolean;
  unread?: number;
}

export function NavItemLink({ item, href, tone, active, rail, unread = 0 }: NavItemLinkProps) {
  const Icon = item.icon;
  const iconSize = rail ? 20 : 18;
  const className = [
    "flex items-center gap-[10px] rounded-[var(--radius-sm)] py-[7px] text-[14px] text-text no-underline transition-colors",
    rail ? "justify-center px-0" : "border-l-2 py-[7px] pl-[10px] pr-[10px]",
    active ? "font-medium" : "hover:bg-hover",
    !rail && (active ? "border-[color:var(--area)]" : "border-transparent"),
  ]
    .filter(Boolean)
    .join(" ");
  const style: CSSProperties = { ...areaStyle(tone), background: active ? "var(--area-soft)" : undefined };
  const label = rail ? <span className="sr-only">{item.label}</span> : item.label;
  const icon = <Icon size={iconSize} strokeWidth={1.75} className="shrink-0 text-[color:var(--area)]" aria-hidden="true" />;

  if (item.external) {
    if (!href) {
      return (
        <span
          aria-disabled="true"
          className={`${className} cursor-not-allowed opacity-50`}
          style={style}
          title={`${item.label}: configurare NEXT_PUBLIC_NRT_METRICS_URL con un URL HTTP o HTTPS valido`}
        >
          {icon}
          {label}
        </span>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
        title={`${item.label} (si apre in una nuova scheda)`}
        aria-describedby="sidebar-new-tab"
      >
        <span className="relative shrink-0">
          {icon}
          {rail && <ExternalLink size={9} className="absolute -right-1 -bottom-1 bg-surface" aria-hidden="true" />}
        </span>
        {label}
        {!rail && <ExternalLink size={12} className="ml-auto shrink-0 text-text-dim" aria-hidden="true" />}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      style={style}
      title={rail ? item.label : undefined}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
      {!rail && item.href === "/messages" && unread > 0 && (
        <span
          data-testid="sidebar-unread"
          className="ml-auto rounded-full px-[7px] text-[11px] font-bold leading-[18px]"
          style={{ background: "var(--accent)", color: "var(--accent-fg, #fff)" }}
        >
          {unread}
        </span>
      )}
    </Link>
  );
}
