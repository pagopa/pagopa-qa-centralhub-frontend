import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function TasNrtsLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:tas_nrts">{children}</RouteGuard>;
}
