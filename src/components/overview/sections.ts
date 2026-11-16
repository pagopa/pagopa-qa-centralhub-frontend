import {
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileText,
  LayoutGrid,
  Network,
  PackageCheck,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useFeatureVisibility } from "@/hooks/useFeatureVisibility";
import { usePermissions } from "@/hooks/usePermissions";

export interface OverviewSection {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Same permission and feature toggle as the sidebar entry. */
  action: string;
  featureKey: string;
  color: string;
  softColor: string;
  badge?: string;
}

const tone = (color: string) => ({ color: `var(--${color})`, softColor: `var(--${color}-soft)` });

export const COMPETENCE_CENTRE_SECTIONS: OverviewSection[] = [
  { href: "/ea-map", label: "Architettura", description: "Mappa EA: blueprint, prodotti, componenti, dipendenze e copertura dei test.", icon: Network, action: "view:ea_map", featureKey: "ea_map", ...tone("accent") },
  { href: "/docs", label: "Docs & Decks", description: "Guide, template e presentazioni del centro di competenza.", icon: FileText, action: "view:docs", featureKey: "docs", ...tone("success") },
  { href: "/jira", label: "KPI Jira", description: "Issue per status, componente e fase. Alert e trend settimanale.", icon: LayoutGrid, action: "view:jira", featureKey: "jira", ...tone("info") },
  { href: "/api-docs", label: "API Docs", description: "Documentazione interattiva (Swagger UI) delle API del backend QA Hub.", icon: BookOpen, action: "view:api_docs", featureKey: "api_docs", ...tone("info") },
];

export const TESTING_SECTIONS: OverviewSection[] = [
  { href: "/quality-gate", label: "Quality Gate", description: "Esecuzioni del Quality Gate e lancio del TAS come gate.", icon: ShieldCheck, action: "view:qg_nrts", featureKey: "qg_nrts", ...tone("success") },
  { href: "/nrts", label: "NRTs", description: "Gestione e monitoraggio dei test di non regressione.", icon: ClipboardCheck, action: "view:nrts", featureKey: "nrts", ...tone("info") },
  { href: "/flaky-scenarios", label: "Scenari flaky", description: "Indice di flakiness sullo storico delle run e gestione dei flag.", icon: Shuffle, action: "view:flaky", featureKey: "flaky_scenarios", badge: "NEW", ...tone("danger") },
  { href: "/tas-nrts", label: "TAS (Test Automation Services)", description: "Gestione e monitoraggio delle esecuzioni dei test TAS.", icon: Workflow, action: "view:tas_nrts", featureKey: "tas_nrts", ...tone("warning") },
  { href: "/bdd", label: "Gherkin Generator", description: "Scenari BDD da requisiti Confluence, PDF o testo libero con AI.", icon: Sparkles, action: "view:bdd", featureKey: "bdd", ...tone("warning") },
  { href: "/releases", label: "Status Page", description: "Versioni in DEV, UAT e PROD, storico dei deploy e test eseguiti.", icon: PackageCheck, action: "view:status_page", featureKey: "release_status", badge: "NEW", ...tone("accent") },
];

export const DATA_QUALITY_SECTIONS: OverviewSection[] = [
  { href: "/data-quality/catalog", label: "Data Quality", description: "Catalogo controlli e istanze per dominio: dimensioni, rischio, impatto e stato.", icon: ShieldCheck, action: "view:data_quality", featureKey: "dq_catalog", ...tone("info") },
  { href: "/data-hub/gpd-positions", label: "Posizioni Debitorie GPD", description: "Andamento di GPD, GPD4ACA, WISP e paCreatePosition, sincronizzato ogni giorno.", icon: Wallet, action: "view:data_hub", featureKey: "gpd_positions", ...tone("success") },
  { href: "/data-hub/psp-fees", label: "PSP Commissioni", description: "Catalogo PSP/servizi pagoPA AFM: commissioni, soglie e canali.", icon: CreditCard, action: "view:data_hub", featureKey: "psp_fees", ...tone("danger") },
];

/** Sections the user can open: permission granted and feature enabled, as in the sidebar. */
export function useVisibleSections(sections: OverviewSection[]): OverviewSection[] {
  const { can, isLoading } = usePermissions();
  const features = useFeatureVisibility();
  if (isLoading || features.isLoading || features.isError) return [];
  const enabled = new Set((features.data?.items ?? []).filter((feature) => feature.enabled).map((feature) => feature.key));
  return sections.filter((section) => enabled.has(section.featureKey) && can(section.action));
}
