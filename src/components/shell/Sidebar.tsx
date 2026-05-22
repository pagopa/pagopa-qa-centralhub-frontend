"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: "Home" },
      { href: "/dashboards", label: "Dashboards", icon: "Grid" },
    ],
  },
  {
    label: "Test Results",
    items: [
      { href: "/e2e", label: "E2E", icon: "Beaker" },
      { href: "/coverage", label: "Coverage", icon: "Chart" },
      { href: "/perf", label: "Performance", icon: "Gauge" },
    ],
  },
  {
    label: "Project Tracking",
    items: [
      { href: "/jira", label: "KPI Jira", icon: "Jira" },
      { href: "/bugs", label: "Defect Tracker", icon: "Bug" },
      { href: "/releases", label: "Releases", icon: "Tag" },
    ],
  },
  {
    label: "Knowledge Base",
    items: [{ href: "/docs", label: "Docs & Decks", icon: "Doc" }],
  },
  {
    label: "Amministrazione",
    items: [{ href: "/settings/integrations", label: "Settings", icon: "Cog", roleRequired: "qa_lead" as const }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          minHeight: "var(--topbar-h)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "var(--text)",
            color: "var(--bg)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-geist-mono)",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          QA
        </div>
        <div>
          <div style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>QA Hub</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
            portal
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ padding: "8px 8px" }}>
            <div
              style={{
                font: `500 10px var(--font-geist-mono)`,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                padding: "8px 10px 6px",
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: "var(--radius-sm)",
                    color: isActive ? "var(--accent)" : "var(--text-dim)",
                    background: isActive ? "var(--accent-soft)" : "transparent",
                    fontWeight: isActive ? 500 : 450,
                    textDecoration: "none",
                    fontSize: 14,
                  }}
                >
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
