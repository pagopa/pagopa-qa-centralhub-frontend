import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function FlakyScenariosLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:flaky">{children}</RouteGuard>;
}
