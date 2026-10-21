"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useFeatureVisibility } from "@/hooks/useFeatureVisibility";
import { featureKeyForPath } from "@/lib/features";

export function RouteGuard({ action, children }: { action: string; children: ReactNode }) {
  const { can, isLoading } = usePermissions();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const featureKey = featureKeyForPath(pathname);
  const featuresQuery = useFeatureVisibility(Boolean(featureKey));
  const isFeatureLoading = Boolean(featureKey) && featuresQuery.isFetching;
  const isFeatureError = featuresQuery.isError;
  const refetchFeatures = featuresQuery.refetch;
  const feature = featuresQuery.data?.items.find((item) => item.key === featureKey);
  const isFeatureDisabled = Boolean(featureKey) && !feature?.enabled;
  const router = useRouter();

  useEffect(() => {
    if (previousPathname.current !== pathname && featureKey) {
      void refetchFeatures();
    }
    previousPathname.current = pathname;
  }, [pathname, featureKey, refetchFeatures]);

  useEffect(() => {
    if (!isLoading && !isFeatureLoading && !isFeatureError && !isFeatureDisabled && !can(action)) {
      router.replace("/");
    }
  }, [isLoading, isFeatureLoading, isFeatureError, isFeatureDisabled, can, action, router]);

  if (isLoading || isFeatureLoading) return null;
  if (featureKey && isFeatureError) {
    return <p role="alert">Impossibile verificare la disponibilità della funzionalità.</p>;
  }
  if (isFeatureDisabled) {
    return (
      <div role="status" className="px-4 py-10 text-center text-sm text-text-muted">
        <h1 className="font-semibold text-text">Funzionalità non disponibile</h1>
        <p className="mt-1">Questa pagina è stata disattivata da un amministratore.</p>
      </div>
    );
  }
  if (!can(action)) return null;
  return <>{children}</>;
}
