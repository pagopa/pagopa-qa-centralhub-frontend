"use client";

import { useEffect, useRef, useState } from "react";
import { embedDashboard } from "@superset-ui/embedded-sdk";
import { useGuestToken } from "@/hooks/useSupersetAuth";
export default function MetricsPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { data: guestToken, isLoading: loadingGuestToken, isError: errorLoading } = useGuestToken();
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    (async () => {
    if (!mountRef.current || !guestToken) return;
    const token = guestToken;

    const dash = await embedDashboard({
      id: process.env.NEXT_PUBLIC_SUPERSET_DASHBOARD_UUID ?? "",
      supersetDomain: process.env.NEXT_PUBLIC_SUPERSET_URL ?? "",
      mountPoint: mountRef.current,
      fetchGuestToken: async () => token,
      dashboardUiConfig: {
        hideTitle: true,
        filters: { expanded: true },
      },
    }).catch((error) => {
      console.error("Error embedding dashboard:", error);
      setLoaded(false);
    })

    dash?.setThemeMode("dark");

    const iframe = mountRef.current?.querySelector("iframe") as HTMLIFrameElement | null;
    if (iframe) {
      iframe.style.height = "100%";
      iframe.style.width = "100%";
      iframe.style.display = "block";
    }
    })();
  }, [guestToken, loaded]);
  if (loadingGuestToken) {
    return <p className="text-text-muted text-[13px]">Caricamento…</p>;
  }

  if(!loaded){
        return <p className="text-text-muted text-[13px]">Si è verificato un errore durante il caricamento della dashboard.</p>;

  }

  return <div ref={mountRef} className="w-full h-full" />;
 
}
