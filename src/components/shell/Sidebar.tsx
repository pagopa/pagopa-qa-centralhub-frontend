"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Bug,
  FileText,
  Gauge,
  Home,
  LayoutGrid,
  Settings,
  Tag,
  TestTube2,
  type LucideIcon,
} from "lucide-react";

const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: Home },
      { href: "/dashboards", label: "Dashboards", icon: LayoutGrid },
    ],
  },
  {
    label: "Test Results",
    items: [
      { href: "/e2e", label: "E2E", icon: TestTube2 },
      { href: "/coverage", label: "Coverage", icon: BarChart2 },
      { href: "/perf", label: "Performance", icon: Gauge },
    ],
  },
  {
    label: "Project Tracking",
    items: [
      { href: "/jira", label: "KPI Jira", icon: LayoutGrid },
      { href: "/bugs", label: "Defect Tracker", icon: Bug },
      { href: "/releases", label: "Releases", icon: Tag },
    ],
  },
  {
    label: "Knowledge Base",
    items: [{ href: "/docs", label: "Docs & Decks", icon: FileText }],
  },
  {
    label: "Amministrazione",
    items: [{ href: "/settings/integrations", label: "Settings", icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col h-screen border-r border-border bg-surface">
      {/* Brand */}
      <div
        className="flex items-center gap-[10px] px-4 border-b border-border"
        style={{ minHeight: "var(--topbar-h)" }}
      >
        <div
          className="shrink-0 grid place-items-center rounded-[7px] bg-text text-bg font-mono font-semibold"
          style={{ width: 28, height: 28, fontSize: 12 }}
        >
          QA
        </div>
        <div>
          <div className="font-semibold text-[14px] text-text" style={{ letterSpacing: "-0.01em" }}>
            QA Hub
          </div>
          <div className="text-text-muted font-mono" style={{ fontSize: 11 }}>
            portal
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="px-2 py-1">
            <div
              className="text-text-muted font-mono font-medium uppercase px-[10px] pt-2 pb-[6px]"
              style={{ fontSize: 10, letterSpacing: ".08em" }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-[10px] px-[10px] py-[7px] rounded-[var(--radius-sm)] no-underline transition-colors text-[14px]"
                  style={{
                    color: isActive ? "var(--accent)" : "var(--text-dim)",
                    background: isActive ? "var(--accent-soft)" : "transparent",
                    fontWeight: isActive ? 500 : 450,
                  }}
                >
                  <Icon size={15} strokeWidth={1.6} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
