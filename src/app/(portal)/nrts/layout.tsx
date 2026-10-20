import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function NrtsLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:nrts">{children}</RouteGuard>;
}
