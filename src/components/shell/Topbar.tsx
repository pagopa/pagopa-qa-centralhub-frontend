"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/dashboards": "Dashboards",
  "/e2e": "E2E",
  "/coverage": "Coverage",
  "/perf": "Performance",
  "/jira": "KPI Jira",
  "/bugs": "Defect Tracker",
  "/releases": "Releases",
  "/docs": "Docs & Decks",
  "/settings/integrations": "Settings · Integrations",
  "/settings/bdd": "Settings · Gherkin Generator",
  "/settings/team": "Settings · Team",
  "/settings/notifications": "Settings · Notifications",
  "/settings/general": "Settings · General",
};

export function Topbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "QA Hub";

  return (
    <header
      style={{
        height: "var(--topbar-h)",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--pad)",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{title}</span>

      {/* User avatar placeholder */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--accent-soft)",
          color: "var(--accent)",
          display: "grid",
          placeItems: "center",
          fontWeight: 600,
          fontSize: 11,
          fontFamily: "var(--font-geist-mono)",
          cursor: "pointer",
        }}
      >
        QA
      </div>
    </header>
  );
}
