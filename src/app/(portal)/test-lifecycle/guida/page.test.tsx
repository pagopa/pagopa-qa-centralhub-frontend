import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import Page from "./page";

const TABS = ["Panoramica", "Progettazione", "Git", "Jira", "NRT", "Migrazione", "Domande frequenti"];

const SECTIONS: [string, string[]][] = [
  ["Panoramica", ["Il processo in breve", "Chi fa cosa"]],
  ["Progettazione", ["1. Preparare l'ambito", "2. Progettare la feature", "Importa da Git", "3. Review"]],
  ["Git", ["4. PR e merge su GitHub", "5. Modifiche fatte direttamente su Git", "6. Riaprire e riallineare", "Anomalie"]],
  ["Jira", ["Jira"]],
  ["NRT", ["Come una feature si collega agli NRT"]],
  ["Migrazione", ["Migrazione da Confluence", "Il pannello \"Tag trovati nei feature file\""]],
  ["Domande frequenti", ["Domande frequenti"]],
];

describe("test lifecycle guide", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("groups the guide in tabs and opens the overview with the process diagram", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Guida al Test Lifecycle" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(TABS);
    expect(screen.getByRole("img", { name: /Diagramma del ciclo di vita/ })).toBeInTheDocument();
  });

  it("shows the two backward arrows in the process diagram", () => {
    render(<Page />);
    const diagram = screen.getByRole("img", { name: /Diagramma del ciclo di vita/ });
    expect(within(diagram).getByText("← Ritira")).toBeInTheDocument();
    expect(within(diagram).getByText("← Riporta")).toBeInTheDocument();
  });

  it("keeps the backward labels clear of the Jira tag under Bozza", () => {
    render(<Page />);
    const diagram = screen.getByRole("img", { name: /Diagramma del ciclo di vita/ });
    const label = within(diagram).getByText("← Ritira");
    // the tag ends at x=170: the label starts to its right instead of being centred on the gap
    expect(label).toHaveAttribute("text-anchor", "start");
    expect(Number(label.getAttribute("x"))).toBeGreaterThanOrEqual(172);
  });

  it("explains how to go back and what happens to the open PR", async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole("tab", { name: "Progettazione" }));
    expect(screen.getByText("Ritira in bozza")).toBeInTheDocument();
    const withdrawApproval = screen.getByText("Riporta in review").closest("li")!;
    expect(withdrawApproval).toHaveTextContent("resta aperta");
    expect(withdrawApproval).toHaveTextContent("non mergiarla");
  });

  it.each(SECTIONS)("shows the %s sections", async (tab, headings) => {
    render(<Page />);
    await userEvent.click(screen.getByRole("tab", { name: tab }));
    for (const title of headings) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it("explains the NRT link with an example flow and updates the address", async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole("tab", { name: "NRT" }));
    const flow = screen.getByRole("list", { name: /lo scenario 01 di FEAT_011_FdR3/ });
    const steps = within(flow).getAllByRole("listitem");
    expect(steps).toHaveLength(6);
    expect(steps[2]).toHaveTextContent("tag = FDR3_011_01");
    expect(window.location.hash).toBe("#nrt");
  });

  it("opens the tab named in the address", () => {
    window.history.replaceState(null, "", "#migrazione");
    render(<Page />);
    expect(screen.getByRole("heading", { level: 2, name: "Migrazione da Confluence" })).toBeInTheDocument();
  });

  it("links back to the module and, in the Git tab, to the issues page", async () => {
    render(<Page />);
    expect(screen.getAllByRole("link", { name: /Test Lifecycle/ })[0]).toHaveAttribute("href", "/test-lifecycle");
    await userEvent.click(screen.getByRole("tab", { name: "Git" }));
    expect(screen.getByRole("link", { name: "pagina Anomalie" })).toHaveAttribute("href", "/test-lifecycle/anomalie");
  });
});
