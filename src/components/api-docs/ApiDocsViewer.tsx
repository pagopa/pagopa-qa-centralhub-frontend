"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiClient, API_BASE_URL } from "@/lib/api";

type LoadState = "loading" | "ready" | "error";

/**
 * Swagger UI over the backend OpenAPI specification.
 *
 * The specification is read with the regular API client from `/api/v1/meta/openapi`: the
 * built-in `/api/v1/openapi.json` is not exposed by the gateway in front of the backend.
 * "Try it out" is limited to GET requests, which cannot change any data, and it targets the
 * same base URL as every other call of the portal.
 */
export function ApiDocsViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    async function mount() {
      try {
        // The bundle and its styles are large: load them only when this page is opened.
        const [bundleModule, spec] = await Promise.all([
          import("swagger-ui-dist/swagger-ui-bundle"),
          apiClient<Record<string, unknown>>("/api/v1/meta/openapi"),
        ]);
        await import("swagger-ui-dist/swagger-ui.css");
        if (cancelled || !container) return;
        const SwaggerUIBundle = bundleModule.default;
        SwaggerUIBundle({
          // The served specification has no `servers`: without one Swagger would call the
          // portal's own origin instead of the backend.
          spec: { ...spec, servers: [{ url: API_BASE_URL }] },
          domNode: container,
          deepLinking: true,
          docExpansion: "list",
          defaultModelsExpandDepth: -1,
          supportedSubmitMethods: ["get"],
        });
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void mount();
    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {state === "loading" && (
        <p className="flex items-center gap-2 text-[13px] text-text-muted">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Caricamento della documentazione…
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="text-[13px] text-danger">
          Impossibile caricare la documentazione delle API. Verifica che l&apos;endpoint
          /api/v1/meta/openapi sia raggiungibile (dopo un rilascio va reimportata la specifica in APIM).
        </p>
      )}
      {/* Swagger UI has no dark theme: it lives on a light panel in every portal theme. */}
      <div
        ref={containerRef}
        aria-label="Documentazione API"
        className="min-h-40 overflow-x-auto rounded-[var(--radius-sm)] border border-border bg-white p-2 text-black"
      />
    </div>
  );
}
