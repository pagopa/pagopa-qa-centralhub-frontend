"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  FileText,
  Home,
  LayoutGrid,
  Settings,
  Sparkles,
  TestTube2,
  type LucideIcon,
} from "lucide-react";

const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: Home },
    ],
  },
  {
    label: "BDD",
    items: [
      { href: "/bdd", label: "Gherkin Generator", icon: Sparkles },
    ],
  },
  {
    label: "Test Results",
    items: [
      { href: "/e2e", label: "E2E", icon: TestTube2 },
    ],
  },
  {
    label: "Project Tracking",
    items: [
      { href: "/jira", label: "KPI Jira", icon: LayoutGrid },
    ],
  },
  {
    label: "Data Hub",
    items: [
      { href: "/data-hub/psp-fees", label: "PSP Commissioni", icon: CreditCard },
    ],
  },
  {
    label: "Knowledge Base",
    items: [{ href: "/docs", label: "Docs & Decks", icon: FileText }],
  },
  {
    label: "Amministrazione",
    items: [
      { href: "/settings/integrations", label: "Settings E2E", icon: Settings },
      { href: "/settings/bdd", label: "Settings Gherkin", icon: Sparkles },
    ],
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
        <div className="flex-1">
          <div className="font-semibold text-[14px] text-text" style={{ letterSpacing: "-0.01em" }}>
            QA Hub
          </div>
          <div className="text-text-muted font-mono" style={{ fontSize: 11 }}>
            portal
          </div>
        </div>
        <svg
          viewBox="0 0 35 23"
          fill="currentColor"
          className="text-text-dim shrink-0"
          style={{ height: 13, width: "auto" }}
          aria-label="pagoPA"
        >
          <path d="M24.4,6.9v2.9h-2.1V0h2.1h0.2h1.5C27.4,0,28,0.3,28,1v4.8c0,0.7-0.6,1-1.8,1L24.4,6.9L24.4,6.9L24.4,6.9zM26,1.1h-1.6v4.5H26V1.1z"/>
          <path d="M1.8,9.8v2.9H0V2.9h1.8H2h1.3c1.1,0,1.6,0.3,1.6,1v4.8c0,0.7-0.5,1-1.5,1L1.8,9.8L1.8,9.8zM3.1,4H1.8v4.5h1.3V4z"/>
          <path d="M10.4,9.7H7c-1,0-1.5-0.3-1.5-1v-2c0-0.7,0.5-1,1.5-1h1.6V4H7.3v0.9H5.5v-1c0-0.7,0.5-1,1.6-1h1.7c1,0,1.5,0.3,1.5,1L10.4,9.7L10.4,9.7zM7.3,8.6h1.3V6.8H7.3V8.6z"/>
          <path d="M14.2,9.7h-1.6c-1,0-1.5-0.3-1.5-1V3.9c0-0.7,0.5-1,1.6-1H14h0.2H16v8.8c0,0.7-0.5,1-1.6,1h-1.8c-1,0-1.6-0.3-1.6-1v-1h1.8v0.9h1.3L14.2,9.7L14.2,9.7zM12.9,8.6h1.3V4h-1.3V8.6z"/>
          <path d="M21.5,8.7c0,0.7-0.5,1-1.6,1h-1.7c-1,0-1.6-0.3-1.6-1V3.9c0-0.7,0.5-1,1.6-1H20c1,0,1.5,0.3,1.5,1V8.7L21.5,8.7zM19.8,4h-1.3v4.5h1.3V4z"/>
          <path d="M34.7,1.1c0-0.7-0.6-1-1.8-1h-2.1c-1.2,0-1.9,0.3-1.9,1v8.7H31v-3h1.6v2.5c0,6.4-5.2,11.6-11.6,11.6c-3.7,0-7-1.8-9.1-4.5l1.1-0.8l-4.3-2.9l0.2,6l1.4-1.1C12.7,20.9,16.6,23,21,23c7.6,0,13.7-6.1,13.7-13.7V1.1zM32.6,5.7H31V1.2h1.6V5.7z"/>
        </svg>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 min-h-0">
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
