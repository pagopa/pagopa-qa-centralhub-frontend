"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

export function RouteGuard({ action, children }: { action: string; children: ReactNode }) {
  const { can, isLoading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !can(action)) {
      router.replace("/");
    }
  }, [isLoading, can, action, router]);

  if (isLoading || !can(action)) return null;
  return <>{children}</>;
}
