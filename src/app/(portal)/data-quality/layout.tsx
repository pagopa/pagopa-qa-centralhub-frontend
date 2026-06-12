import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function DataQualityLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:data_quality">{children}</RouteGuard>;
}
