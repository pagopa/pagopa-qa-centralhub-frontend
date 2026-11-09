import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function ApiDocsLayout({ children }: { children: ReactNode }) {
  return <RouteGuard action="view:api_docs">{children}</RouteGuard>;
}
