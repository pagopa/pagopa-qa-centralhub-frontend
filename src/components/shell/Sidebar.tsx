"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { NAV_SECTIONS, matchesQuery, type NavItem } from "./nav-config";
import { NavItemLink } from "./NavItemLink";
import { NavSection } from "./NavSection";
import { useInboxSummary } from "@/hooks/useMessaging";
import { usePermissions } from "@/hooks/usePermissions";
import { useFeatureVisibility } from "@/hooks/useFeatureVisibility";
import { useStoredFlag } from "@/lib/stored-flag";
import { useActiveTheme, withTheme } from "@/lib/theme";

const COLLAPSED_KEY = "qa-hub-sidebar-collapsed";

const DEFAULT_NRT_METRICS_URL =
  "https://pagopa-u-weu-grafana-cpavbjb0axhrdcg3.weu.grafana.azure.com/d/an5bhhc/qa-nrt-metrics?theme=light&orgId=1&from=now-30d&to=now&timezone=browser&var-test_object=checkout&var-test_object=wisp&var-test_object=fdr3&editIndex=0&tab=transformations&kiosk";

export function Sidebar() {
  const configuredDashboardUrl = process.env.NEXT_PUBLIC_NRT_METRICS_URL?.trim() || DEFAULT_NRT_METRICS_URL;
  const dashboardUrl = configuredDashboardUrl
    && URL.canParse(configuredDashboardUrl)
    && ["https:", "http:"].includes(new URL(configuredDashboardUrl).protocol)
    ? configuredDashboardUrl
    : "";
  const activeTheme = useActiveTheme();
  const pathname = usePathname();
  const { can, role, isLoading } = usePermissions();
  const featuresQuery = useFeatureVisibility();
  const unreadMessages = useInboxSummary().data?.unread ?? 0;
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSED_KEY);
  const [query, setQuery] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => false,
  );
  const filtering = !collapsed && query.trim() !== "";

  useEffect(() => {
    if (collapsed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.shiftKey || event.altKey) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        // Leave dialogs alone: moving focus out of them would break their focus trap.
        if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return;
        event.preventDefault();
        filterRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [collapsed]);

  useEffect(() => {
    const root = document.documentElement;
    if (collapsed) root.setAttribute("data-sidebar", "collapsed");
    else root.removeAttribute("data-sidebar");
  }, [collapsed]);

  function isVisible(item: NavItem): boolean {
    if (isLoading) return false;
    if (item.requiresSuperadmin) return role === "superadmin";
    if (item.featureKey && (featuresQuery.isLoading || featuresQuery.isError)) return false;
    if (item.featureKey && !featuresQuery.data?.items.some(
      (feature) => feature.key === item.featureKey && feature.enabled,
    )) return false;
    if (item.action) return can(item.action);
    return true;
  }

  const isItemActive = (item: NavItem) =>
    !item.external && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));

  /** Sections with at least one entry to show; `visible` ignores the filter, `items` applies it. */
  const sections = NAV_SECTIONS.map((section) => {
    const visible = section.items.filter(isVisible);
    const items = filtering ? visible.filter((item) => matchesQuery(section, item, query)) : visible;
    return { section, visible, items };
  }).filter(({ items }) => items.length > 0);

  return (
    <aside className="flex flex-col h-screen border-r border-border bg-surface">
      <span id="sidebar-new-tab" className="sr-only">Si apre in una nuova scheda</span>
      {/* Brand */}
      <div
        className={`flex items-center gap-[10px] border-b border-border ${collapsed ? "justify-center px-2" : "px-4"}`}
        style={{ minHeight: "var(--topbar-h)" }}
      >
        <div
          className="shrink-0 grid place-items-center rounded-[7px] bg-text text-bg font-mono font-semibold"
          style={{ width: 28, height: 28, fontSize: 12 }}
        >
          QA
        </div>
        <div className={collapsed ? "hidden" : "flex-1"}>
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
          className={collapsed ? "hidden" : "text-text-dim shrink-0"}
          style={{ height: 25, width: "auto" }}
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

      {!collapsed && (
        <div className="relative mx-[10px] mt-[10px] mb-1">
          <Search size={15} className="pointer-events-none absolute left-[10px] top-[10px] text-text-dim" aria-hidden="true" />
          <input
            ref={filterRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
            placeholder="Cerca voce"
            aria-label="Cerca voce"
            className="h-[34px] w-full rounded-[var(--radius-sm)] border border-border bg-subtle pl-[32px] pr-[52px] text-[13px] text-text placeholder:text-text-dim focus:border-[color:var(--accent)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd className="pointer-events-none absolute right-2 top-[8px] rounded-[4px] border border-border px-[5px] font-mono text-[11px] text-text-dim">
            {isMac ? "⌘ K" : "Ctrl K"}
          </kbd>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 min-h-0">
        {sections.map(({ section, visible, items }) => (
          <NavSection
            key={section.id}
            id={section.id}
            label={section.label}
            tone={section.tone}
            defaultClosed={section.defaultClosed}
            count={visible.length}
            hasActive={visible.some(isItemActive)}
            forceOpen={filtering}
            rail={collapsed}
          >
            {items.map((item) => (
              <NavItemLink
                key={item.featureKey ?? item.href}
                item={item}
                href={item.featureKey === "nrt_metrics" ? withTheme(dashboardUrl, activeTheme) : item.href}
                tone={section.tone}
                active={isItemActive(item)}
                rail={collapsed}
                unread={unreadMessages}
              />
            ))}
          </NavSection>
        ))}
        {filtering && sections.length === 0 && (
          <p className="px-[18px] py-4 text-[13px] text-text-dim">Nessuna voce trovata</p>
        )}
      </nav>

      <div className={`border-t border-border p-2 ${collapsed ? "flex justify-center" : ""}`}>
        <button
          type="button"
          onClick={() => {
            if (!collapsed) setQuery("");
            setCollapsed(!collapsed);
          }}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Espandi menu" : "Riduci menu"}
          title={collapsed ? "Espandi menu" : "Riduci menu"}
          className="flex w-full items-center gap-[10px] rounded-[var(--radius-sm)] px-[10px] py-[7px] text-[13px] text-text-dim transition-colors hover:bg-hover"
          style={collapsed ? { justifyContent: "center", paddingInline: 0 } : undefined}
        >
          {collapsed ? <PanelLeftOpen size={17} strokeWidth={1.6} /> : <PanelLeftClose size={15} strokeWidth={1.6} />}
          {!collapsed && "Riduci menu"}
        </button>
      </div>
    </aside>
  );
}
