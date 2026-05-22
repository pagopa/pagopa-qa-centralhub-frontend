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
  "/settings/team": "Settings · Team",
  "/settings/notifications": "Settings · Notifications",
  "/settings/general": "Settings · General",
};

const ENVIRONMENTS = ["UAT", "PROD", "STAGING"];

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

      {/* Environment selector — wired up in Sprint 1 */}
      <select
        style={{
          background: "var(--subtle)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "4px 10px",
          fontSize: 13,
          color: "var(--text)",
          fontFamily: "inherit",
          cursor: "pointer",
        }}
        defaultValue="UAT"
      >
        {ENVIRONMENTS.map((env) => (
          <option key={env} value={env}>
            {env}
          </option>
        ))}
      </select>

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
