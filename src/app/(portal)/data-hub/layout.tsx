import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function DataHubLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:data_hub">{children}</RouteGuard>;
}
