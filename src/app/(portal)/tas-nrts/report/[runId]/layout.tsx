import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

// The single-run report is readable by every role (guest included), unlike the TAS list:
// it is opened from links such as the EA map «Live» panel.
export default function TasReportLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:tas_report">{children}</RouteGuard>;
}
