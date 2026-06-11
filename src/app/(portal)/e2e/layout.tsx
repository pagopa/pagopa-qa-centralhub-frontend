import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function E2eLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:e2e">{children}</RouteGuard>;
}
