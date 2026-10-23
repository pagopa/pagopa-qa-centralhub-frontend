/**
 * Infrastructure view: logical type → symbol, vendor → badge, notification channel → symbol.
 *
 * Pure configuration, kept apart from the view so it can be reused (e.g. Atlas) and so the
 * generic symbols can be swapped for the official architecture icons (Azure, AWS, Grafana,
 * Slack, Opsgenie) once their license has been checked. The logical types come from the
 * backend (app/services/ea/infra/config.py, TYPE_RULES).
 */
import {
  Activity,
  AppWindow,
  BellRing,
  Box,
  ChartColumn,
  Container,
  Database,
  DatabaseZap,
  FolderTree,
  Gauge,
  Globe,
  Hash,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessagesSquare,
  Network,
  Ship,
  Siren,
  Waypoints,
  Webhook,
  Workflow,
  Zap,
  Fingerprint,
  MonitorSmartphone,
  DoorOpen,
  Plug,
  Cpu,
  ShieldCheck,
  Users,
  Building2,
  Landmark,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export interface InfraTypeStyle {
  icon: LucideIcon;
  label: string;
  /** CSS colour token of the symbol tile */
  color: string;
}

export const INFRA_TYPES: Record<string, InfraTypeStyle> = {
  cdn: { icon: Globe, label: "CDN / Front Door", color: "#2a7bd8" },
  api_gateway: { icon: Waypoints, label: "API Gateway", color: "#7a5bd0" },
  kubernetes: { icon: Ship, label: "Kubernetes", color: "#326ce5" },
  function: { icon: Zap, label: "Function", color: "#d6a21e" },
  app_service: { icon: AppWindow, label: "App Service", color: "#3d8fd6" },
  container: { icon: Container, label: "Container", color: "#0f8a87" },
  storage: { icon: HardDrive, label: "Storage", color: "#5b7c99" },
  db_sql: { icon: Database, label: "Database SQL", color: "#2f6fb0" },
  db_nosql: { icon: DatabaseZap, label: "Database NoSQL", color: "#18705a" },
  cache: { icon: Gauge, label: "Cache", color: "#c8483f" },
  messaging: { icon: MessagesSquare, label: "Messaging", color: "#9a6a2f" },
  data_pipeline: { icon: Workflow, label: "Data pipeline", color: "#4f6bd8" },
  analytics: { icon: ChartColumn, label: "Analytics", color: "#5a4fcf" },
  secrets: { icon: KeyRound, label: "Secrets", color: "#b8861b" },
  network: { icon: Network, label: "Rete", color: "#2a9d8f" },
  identity: { icon: Fingerprint, label: "Identità", color: "#6b7686" },
  monitoring: { icon: Activity, label: "Monitoring", color: "#dd7f2e" },
  action_group: { icon: Megaphone, label: "Action group", color: "#c25e2a" },
  dashboard: { icon: LayoutDashboard, label: "Dashboard", color: "#f46800" },
  email: { icon: Mail, label: "Email", color: "#e07b24" },
  resource_group: { icon: FolderTree, label: "Resource group", color: "#6b7686" },
};

/** Fallback for logical types not mapped above. */
export const INFRA_GENERIC: InfraTypeStyle = { icon: Box, label: "Altro", color: "#8d97a8" };

export function infraType(ltype: string): InfraTypeStyle {
  return INFRA_TYPES[ltype] ?? INFRA_GENERIC;
}

export const VENDORS: Record<string, { label: string; short: string }> = {
  azure: { label: "Microsoft Azure", short: "Azure" },
  aws: { label: "Amazon Web Services", short: "AWS" },
  grafana: { label: "Grafana", short: "Grafana" },
  generic: { label: "Altro", short: "—" },
};

export const CHANNELS: Record<string, { icon: LucideIcon; label: string }> = {
  email: { icon: Mail, label: "Email" },
  slack: { icon: Hash, label: "Slack" },
  opsgenie: { icon: Siren, label: "Opsgenie" },
  webhook: { icon: Webhook, label: "Webhook" },
  sms: { icon: BellRing, label: "SMS" },
  logic_app: { icon: Workflow, label: "Logic App" },
};

export function channelStyle(channel: string) {
  return CHANNELS[channel] ?? { icon: BellRing, label: channel };
}

/** Alert severity (Azure: 0 critical … 4 verbose). */
export const SEVERITY_LABEL: Record<string, string> = {
  "0": "Sev 0 · critico",
  "1": "Sev 1 · errore",
  "2": "Sev 2 · warning",
  "3": "Sev 3 · info",
  "4": "Sev 4 · verbose",
};

/** Look of the layers of the top-down view (keys: INFRA_LAYERS in infra.ts). */
export const LAYER_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  frontend: { icon: MonitorSmartphone, color: "#0e9f9a" },
  edge: { icon: DoorOpen, color: "#2a7bd8" },
  api: { icon: Plug, color: "#7a5bd0" },
  compute: { icon: Cpu, color: "#326ce5" },
  messaging: { icon: MessagesSquare, color: "#b7791f" },
  data: { icon: Database, color: "#18805f" },
  cross: { icon: ShieldCheck, color: "#6b7686" },
};

/** Who reaches the platform from outside: the top of the top-down view. */
export const ENTRY_ACTORS: { icon: LucideIcon; label: string }[] = [
  { icon: Users, label: "Cittadini" },
  { icon: Smartphone, label: "App IO" },
  { icon: Landmark, label: "PSP" },
  { icon: Building2, label: "Enti creditori" },
];
