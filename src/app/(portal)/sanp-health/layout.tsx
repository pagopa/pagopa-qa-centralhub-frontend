import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function SanpHealthLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:sanp_health">{children}</RouteGuard>;
}