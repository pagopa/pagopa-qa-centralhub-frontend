import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { PendingBar } from "@/components/test-lifecycle/PendingBar";

export default function TestLifecycleLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard action="view:test_lifecycle">
      <PendingBar />
      {children}
    </RouteGuard>
  );
}
