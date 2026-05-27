"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

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
  const { theme, toggle } = useTheme();

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

      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label={theme === "dark" ? "Passa a light mode" : "Passa a dark mode"}
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--radius-sm)",
          border: "none",
          background: "transparent",
          color: "var(--text-dim)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)";
        }}
      >
        {theme === "dark" ? <Sun size={16} strokeWidth={1.7} /> : <Moon size={16} strokeWidth={1.7} />}
      </button>

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
