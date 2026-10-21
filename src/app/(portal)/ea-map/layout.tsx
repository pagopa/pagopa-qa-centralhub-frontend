import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function EaMapLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:ea_map">{children}</RouteGuard>;
}
