import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function BddLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:bdd">{children}</RouteGuard>;
}
