import {
  Activity,
  Bell,
  BookCheck,
  BookOpen,
  Bot,
  ClipboardCheck,
  CreditCard,
  Database,
  FileText,
  Home,
  LayoutGrid,
  ListChecks,
  Network,
  PackageCheck,
  Radar,
  Receipt,
  Settings2,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type AreaTone = "blue" | "coral" | "violet" | "green" | "amber" | "teal" | "pink" | "gray";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  action?: string;
  requiresSuperadmin?: boolean;
  featureKey?: string;
}

export interface NavSectionConfig {
  id: string;
  label: string;
  tone: AreaTone;
  defaultClosed?: boolean;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    id: "workspace",
    label: "Workspace",
    tone: "blue",
    items: [
      { href: "/", label: "Overview", icon: Home, action: "view:overview", featureKey: "overview" },
      { href: "/messages", label: "Messaggi", icon: Bell, action: "view:inbox" },
    ],
  },
  {
    id: "architecture",
    label: "Architettura",
    tone: "coral",
    items: [{ href: "/ea-map", label: "EA Map", icon: Network, action: "view:ea_map", featureKey: "ea_map" }],
  },
  {
    id: "design",
    label: "Progettazione test",
    tone: "violet",
    items: [
      { href: "/bdd", label: "Gherkin Generator", icon: Sparkles, action: "view:bdd", featureKey: "bdd" },
      { href: "/test-lifecycle", label: "Test Lifecycle", icon: ListChecks, action: "view:test_lifecycle", featureKey: "test_lifecycle" },
    ],
  },
  {
    id: "results",
    label: "Risultati test",
    tone: "green",
    items: [
      { href: "/sanp-health", label: "SANP Health", icon: Radar, action: "view:sanp_health" },
      { href: "/nrts", label: "Non-Regression Tests (NRT)", icon: ClipboardCheck, action: "view:nrts", featureKey: "nrts" },
      { href: "/flaky-scenarios", label: "Scenari flaky", icon: Shuffle, action: "view:flaky", featureKey: "flaky_scenarios" },
      { href: "/tas-nrts", label: "Test Automation Service (TAS)", icon: Workflow, action: "view:tas_nrts", featureKey: "tas_nrts" },
      { href: "/quality-gate", label: "Quality Gate", icon: ShieldCheck, action: "view:qg_nrts", featureKey: "qg_nrts" },
      { href: "", label: "NRT Metrics", icon: Activity, external: true, action: "view:nrt_metrics", featureKey: "nrt_metrics" },
    ],
  },
  {
    id: "release",
    label: "Release e tracking",
    tone: "amber",
    items: [
      { href: "/releases", label: "Status Page", icon: PackageCheck, action: "view:status_page", featureKey: "release_status" },
      { href: "/jira", label: "KPI Jira", icon: LayoutGrid, action: "view:jira", featureKey: "jira" },
    ],
  },
  {
    id: "data",
    label: "Dati e qualità",
    tone: "teal",
    items: [
      { href: "/data-hub/psp-fees", label: "PSP Commissioni", icon: CreditCard, action: "view:data_hub", featureKey: "psp_fees" },
      { href: "/data-hub/gpd-positions", label: "Posizioni Debitorie GPD", icon: Wallet, action: "view:data_hub", featureKey: "gpd_positions" },
      { href: "/data-quality/catalog", label: "Catalogo Controlli", icon: BookCheck, action: "view:data_quality", featureKey: "dq_catalog" },
      { href: "/data-quality/domains", label: "Controlli per Dominio", icon: Database, action: "view:data_quality", featureKey: "dq_domains" },
    ],
  },
  {
    id: "knowledge",
    label: "Sapere",
    tone: "pink",
    items: [
      { href: "/docs", label: "Docs & Decks", icon: FileText, action: "view:docs", featureKey: "docs" },
      { href: "/api-docs", label: "API Docs", icon: BookOpen, action: "view:api_docs", featureKey: "api_docs" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    tone: "gray",
    defaultClosed: true,
    items: [
      { href: "/settings/bdd", label: "Settings Gherkin", icon: Settings2, action: "manage:bdd", featureKey: "settings_gherkin" },
      { href: "/settings/users", label: "Settings Utenti", icon: Users, requiresSuperadmin: true },
      { href: "/settings/ea-assistant", label: "Settings Pagoda", icon: Bot, requiresSuperadmin: true },
      { href: "/settings/tm-resources", label: "Risorse T&M", icon: Receipt, requiresSuperadmin: true },
    ],
  },
];

/** Lowercase, accent-free form used to compare labels with the filter text. */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** True when the entry label or its section title contains the (normalised) query; an empty query matches all. */
export function matchesQuery(section: NavSectionConfig, item: NavItem, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return normalizeText(item.label).includes(q) || normalizeText(section.label).includes(q);
}
