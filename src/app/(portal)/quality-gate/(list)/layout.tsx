import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function QualityGateLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:qg_nrts">{children}</RouteGuard>;
}
