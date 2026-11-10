import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

// The single-run report is readable by every role (guest included), unlike the NRT list:
// it is opened from links such as the EA map «Live» panel.
export default function NrtReportLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:nrts_report">{children}</RouteGuard>;
}
