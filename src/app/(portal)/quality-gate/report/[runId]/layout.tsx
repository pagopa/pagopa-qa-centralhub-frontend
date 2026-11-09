import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

// The single-run report is readable by every role (guest included), unlike the QG list.
export default function QualityGateReportLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:qg_report">{children}</RouteGuard>;
}
