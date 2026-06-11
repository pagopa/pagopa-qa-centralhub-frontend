import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";

export type Role = "superadmin" | "qa_manager" | "qa_analyst" | "qa_engineer" | "guest";

export function Gate({
  action,
  children,
  fallback = null,
}: {
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePermissions();
  return can(action) ? <>{children}</> : <>{fallback}</>;
}
