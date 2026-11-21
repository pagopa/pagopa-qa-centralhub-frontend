import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./page";

describe("test lifecycle guide", () => {
  it("shows the process diagram and the main sections", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Guida al Test Lifecycle" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Diagramma del ciclo di vita/ })).toBeInTheDocument();
    for (const title of [
      "Il processo in breve",
      "Chi fa cosa",
      "1. Preparare l'ambito",
      "2. Progettare la feature",
      "3. Review",
      "4. PR e merge su GitHub",
      "5. Modifiche fatte direttamente su Git",
      "6. Riaprire e riallineare",
      "Jira",
      "Anomalie",
      "Domande frequenti",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("links back to the module and to the issues page", () => {
    render(<Page />);
    expect(screen.getAllByRole("link", { name: /Test Lifecycle/ })[0]).toHaveAttribute("href", "/test-lifecycle");
    expect(screen.getByRole("link", { name: "pagina Anomalie" })).toHaveAttribute("href", "/test-lifecycle/anomalie");
  });
});
