import type { QualityGateOutcome, QualityGateReportData } from "@/utils/qualityGateReport";
import { ghaRunId, qualityGateReportFileName } from "@/utils/qualityGateReport";

type Rgb = [number, number, number];

const COLORS = {
  accent: [30, 93, 190] as Rgb,
  text: [21, 22, 26] as Rgb,
  muted: [91, 93, 101] as Rgb,
  line: [220, 221, 226] as Rgb,
  tile: [243, 243, 245] as Rgb,
  success: [46, 140, 70] as Rgb,
  danger: [200, 60, 50] as Rgb,
  warning: [214, 150, 20] as Rgb,
};

const OUTCOME_COLOR: Record<QualityGateOutcome, Rgb> = {
  GO: COLORS.success,
  NOGO: COLORS.danger,
  PENDING: COLORS.warning,
};

const PAGE_MARGIN = 14;
// Space kept free at the bottom for the footer (rule at -12 mm, text at -7 mm).
const FOOTER_RESERVE = 16;
// Room needed below a section heading for the heading itself and the first rows or message.
const MIN_SECTION_HEIGHT = 20;

/**
 * Builds the Quality Gate report as a vector PDF (selectable text, multiple pages).
 * jsPDF is imported on demand so it is only downloaded when a report is requested.
 */
export async function buildQualityGateReportPdf(data: QualityGateReportData) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  // Header band
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("QUALITY GATE REPORT", PAGE_MARGIN, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(data.suite, PAGE_MARGIN, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${data.testType} · ${data.environment}`, PAGE_MARGIN, 26);
  doc.text(`${data.start} – ${data.end} · durata ${data.duration}`, PAGE_MARGIN, 31);

  // Outcome badge
  const badgeW = 34;
  doc.setFillColor(...OUTCOME_COLOR[data.outcome]);
  doc.roundedRect(pageWidth - PAGE_MARGIN - badgeW, 7, badgeW, 20, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("ESITO", pageWidth - PAGE_MARGIN - badgeW / 2, 13, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(data.outcome === "PENDING" ? 12 : 18);
  doc.text(data.outcome, pageWidth - PAGE_MARGIN - badgeW / 2, 22, { align: "center" });

  // KPI tiles
  const tiles: Array<[string, string, Rgb]> = [
    ["Totale", String(data.totals.total), COLORS.text],
    ["Passed", String(data.totals.passed), COLORS.success],
    ["Failed", String(data.totals.failed), COLORS.danger],
    ["Broken / skipped", `${data.totals.broken} / ${data.totals.skipped}`, COLORS.text],
    ["Pass rate", `${data.passRate.toFixed(1)}%`, COLORS.text],
  ];
  const gap = 3;
  const tileW = (contentWidth - gap * (tiles.length - 1)) / tiles.length;
  let y = 42;
  tiles.forEach(([label, value, color], i) => {
    const x = PAGE_MARGIN + i * (tileW + gap);
    doc.setFillColor(...COLORS.tile);
    doc.roundedRect(x, y, tileW, 17, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(label, x + 3, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...color);
    doc.text(value, x + 3, y + 14);
  });

  // Distribution bar
  y += 22;
  const { total, passed, failed, broken } = data.totals;
  const barTotal = total > 0 ? total : 1;
  const segments: Array<[number, Rgb]> = [
    [passed, COLORS.success],
    [failed, COLORS.danger],
    [broken, COLORS.warning],
  ];
  let x = PAGE_MARGIN;
  doc.setFillColor(...COLORS.line);
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, 3, 1.5, 1.5, "F");
  segments.forEach(([count, color]) => {
    const w = (count / barTotal) * contentWidth;
    if (w <= 0) return;
    doc.setFillColor(...color);
    doc.rect(x, y, w, 3, "F");
    x += w;
  });

  // Details
  // Links are clickable annotations; the cell text stays short so it fits on one line.
  const runLabel = data.ghaRunUrl ? `Run #${ghaRunId(data.ghaRunUrl) ?? "apri"}` : "—";
  const allureLabel = data.allureUrl ? "Apri report Allure" : "—";
  autoTable(doc, {
    startY: y + 8,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5, textColor: COLORS.text },
    columnStyles: {
      0: { textColor: COLORS.muted, cellWidth: 38 },
      1: { cellWidth: contentWidth / 2 - 38 },
      2: { textColor: COLORS.muted, cellWidth: 38 },
      3: { cellWidth: contentWidth / 2 - 38 },
    },
    body: [
      ["Tipologia", data.testType, "Ambiente", data.environment],
      ["Ver. test object", data.testObjectVersion, "Ver. test suite", data.testSuiteVersion],
      ["Inizio", data.start, "Fine", data.end],
      ["Durata", data.duration, "Revisore", data.reviewer],
      ["Run GitHub Actions", runLabel, "Report Allure", allureLabel],
    ],
    didDrawCell: (hook) => {
      const link = hook.column.index === 1 && hook.row.index === 4 ? data.ghaRunUrl
        : hook.column.index === 3 && hook.row.index === 4 ? data.allureUrl : null;
      if (link && hook.section === "body") {
        doc.link(hook.cell.x, hook.cell.y, hook.cell.width, hook.cell.height, { url: link });
      }
    },
  });

  const sectionTitle = (text: string, color: Rgb) => {
    const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    let top = lastY + 9;
    // AutoTable only paginates its own rows: start a new page when the heading and the
    // first content would not fit above the footer.
    if (top + MIN_SECTION_HEIGHT > pageHeight - FOOTER_RESERVE) {
      doc.addPage();
      top = PAGE_MARGIN + 4;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...color);
    doc.text(text, PAGE_MARGIN, top);
    return top + 2;
  };

  // KO scenarios
  const koStart = sectionTitle(`SCENARI KO (${data.koScenarios.length})`, COLORS.danger);
  if (data.koScenarios.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("Nessuno scenario KO: tutti gli scenari eseguiti sono passati.", PAGE_MARGIN, koStart + 5);
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable = { finalY: koStart + 5 };
  } else {
    autoTable(doc, {
      startY: koStart,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [["Scenario", "Stato", "Errore"]],
      body: data.koScenarios.map((s) => [
        s.scenario_name ?? "—",
        (s.status ?? "").toLowerCase(),
        s.error_message ?? "—",
      ]),
      headStyles: { fillColor: COLORS.danger, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2, textColor: COLORS.text, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 18 } },
    });
  }

  // OK scenarios
  const okStart = sectionTitle(`SCENARI OK (${data.okScenarios.length})`, COLORS.success);
  if (data.okScenarios.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("Nessuno scenario passato.", PAGE_MARGIN, okStart + 5);
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable = { finalY: okStart + 5 };
  } else {
    autoTable(doc, {
      startY: okStart,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [["Scenario", "Durata"]],
      body: data.okScenarios.map((s) => [
        s.scenario_name ?? "—",
        s.duration_ms == null ? "—" : `${s.duration_ms} ms`,
      ]),
      headStyles: { fillColor: COLORS.success, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.8, textColor: COLORS.text },
      columnStyles: { 1: { cellWidth: 28, halign: "right" } },
    });
  }

  // Skipped scenarios (only when there are some)
  if (data.skippedScenarios.length > 0) {
    const skipStart = sectionTitle(`SCENARI SALTATI (${data.skippedScenarios.length})`, COLORS.muted);
    autoTable(doc, {
      startY: skipStart,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [["Scenario"]],
      body: data.skippedScenarios.map((s) => [s.scenario_name ?? "—"]),
      headStyles: { fillColor: COLORS.muted, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.8, textColor: COLORS.text },
    });
  }

  // Footer on every page
  const generated = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.line);
    doc.line(PAGE_MARGIN, pageHeight - 12, pageWidth - PAGE_MARGIN, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Generato dal QA Hub il ${generated}`, PAGE_MARGIN, pageHeight - 7);
    doc.text(`Pagina ${page} di ${pages}`, pageWidth - PAGE_MARGIN, pageHeight - 7, { align: "right" });
  }

  return doc;
}

/** Generates the PDF and triggers the browser download. */
export async function downloadQualityGateReportPdf(data: QualityGateReportData): Promise<void> {
  const doc = await buildQualityGateReportPdf(data);
  doc.save(qualityGateReportFileName(data));
}
