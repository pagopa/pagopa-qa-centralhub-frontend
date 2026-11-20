import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function TestLifecycleLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:test_lifecycle">{children}</RouteGuard>;
}
