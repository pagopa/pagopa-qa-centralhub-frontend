import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function MetricsLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:metrics">{children}</RouteGuard>;
}
