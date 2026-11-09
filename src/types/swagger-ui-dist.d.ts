// swagger-ui-dist ships no types for its browser bundle (the @types package only describes the
// Node entry point), so the small part of the API used by the API Docs page is declared here.
declare module "swagger-ui-dist/swagger-ui-bundle" {
  export interface SwaggerUIOptions {
    spec?: unknown;
    domNode?: HTMLElement | null;
    deepLinking?: boolean;
    docExpansion?: "list" | "full" | "none";
    defaultModelsExpandDepth?: number;
    /** HTTP methods for which "Try it out" is offered; an empty list disables it. */
    supportedSubmitMethods?: string[];
  }
  const SwaggerUIBundle: (options: SwaggerUIOptions) => unknown;
  export default SwaggerUIBundle;
}

declare module "swagger-ui-dist/swagger-ui.css";
