"use client";

import { useState } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import {
  useTmResources,
  useCreateTmResource,
  useUpdateTmResource,
  useDeactivateTmResource,
  useTmAbsences,
  useCreateTmAbsence,
  useDeleteTmAbsence,
  useImportTmAbsencesCsv,
  useSyncConfluenceAbsences,
  useTmCostReport,
} from "@/hooks/useTm";
import type {
  CsvAbsenceImportResult,
  ExternalResource,
  ExternalResourceCreate,
  ResourceAbsence,
  ResourceAbsenceCsvRow,
  ResourceCostRow,
} from "@/types/index";

const ABSENCE_TYPES = ["ferie", "malattia", "permesso", "altro"] as const;
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const ABSENCE_COLOR: Record<string, string> = {
  ferie: "var(--info)",
  malattia: "var(--danger)",
  permesso: "var(--warning)",
  altro: "var(--text-muted)",
};

function fmtEur(v: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function normalizeAbsenceType(value: string): string {
  const v = value.trim().toLowerCase();
  if (["ferie", "vacation", "holiday"].includes(v)) return "ferie";
  if (["malattia", "sick", "sickness"].includes(v)) return "malattia";
  if (["permesso", "leave", "permission"].includes(v)) return "permesso";
  if (!v) return "ferie";
  return "altro";
}

function parseAbsenceCsv(text: string): ResourceAbsenceCsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const split = (line: string) => line.split(";").length > line.split(",").length
    ? line.split(";").map((x) => x.trim())
    : line.split(",").map((x) => x.trim());

  const headersRaw = split(lines[0]).map((h) => h.toLowerCase());
  const idxEmail = headersRaw.findIndex((h) => ["email", "mail"].includes(h));
  const idxDate = headersRaw.findIndex((h) => ["absence_date", "date", "data"].includes(h));
  const idxType = headersRaw.findIndex((h) => ["absence_type", "type", "tipo"].includes(h));
  const idxNote = headersRaw.findIndex((h) => ["note", "notes", "nota"].includes(h));

  if (idxEmail < 0 || idxDate < 0) {
    throw new Error("CSV non valido: servono colonne email e absence_date/data");
  }

  const rows: ResourceAbsenceCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = split(lines[i]);
    const email = cols[idxEmail]?.trim().toLowerCase();
    const absence_date = cols[idxDate]?.trim();
    if (!email || !absence_date) continue;
    const rawType = idxType >= 0 ? (cols[idxType] ?? "") : "ferie";
    const note = idxNote >= 0 ? (cols[idxNote] ?? "") : "";
    rows.push({
      email,
      absence_date,
      absence_type: normalizeAbsenceType(rawType),
      note: note || undefined,
    });
  }
  return rows;
}

function parseIcsDate(raw: string): string | null {
  const value = raw.trim();
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizePersonName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAbsenceIcs(text: string, resources: ExternalResource[]): ResourceAbsenceCsvRow[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const rows: ResourceAbsenceCsvRow[] = [];

  const resourceEmailByName = new Map<string, string>();
  for (const r of resources) {
    const full = `${r.first_name} ${r.last_name}`;
    resourceEmailByName.set(normalizePersonName(full), r.email.toLowerCase());
    resourceEmailByName.set(normalizePersonName(`${r.first_name}.${r.last_name}`), r.email.toLowerCase());
    resourceEmailByName.set(normalizePersonName(r.first_name), r.email.toLowerCase());
    resourceEmailByName.set(normalizePersonName(r.last_name), r.email.toLowerCase());
  }

  let inEvent = false;
  let dtStart: string | null = null;
  let dtEnd: string | null = null;
  let attendeeEmail: string | null = null;
  let organizerEmail: string | null = null;
  let attendeeName: string | null = null;
  let organizerName: string | null = null;
  let summary = "";
  let description = "";

  const pickEmailFromName = (candidates: string[]): string | null => {
    for (const candidate of candidates) {
      const normalized = normalizePersonName(candidate);
      if (!normalized) continue;
      const exact = resourceEmailByName.get(normalized);
      if (exact) return exact;
      for (const [name, email] of resourceEmailByName.entries()) {
        if (normalized.includes(name) || name.includes(normalized)) return email;
      }
    }
    return null;
  };

  const flushEvent = () => {
    if (!dtStart) return;
    const fallbackNameFromSummary = summary
      .replace(/^ferie\s*[-:]?/i, "")
      .replace(/^permesso\s*[-:]?/i, "")
      .replace(/^malattia\s*[-:]?/i, "")
      .trim();

    const email = (
      attendeeEmail
      || organizerEmail
      || pickEmailFromName([
        attendeeName || "",
        organizerName || "",
        fallbackNameFromSummary,
      ])
      || ""
    ).toLowerCase().trim();
    if (!email || !email.includes("@")) return;

    const type = normalizeAbsenceType(`${summary} ${description}`);
    const startIso = parseIcsDate(dtStart);
    if (!startIso) return;

    const endIsoRaw = dtEnd ? parseIcsDate(dtEnd) : null;
    // ICS all-day DTEND is often exclusive; convert to inclusive range.
    const endIso = endIsoRaw && endIsoRaw > startIso ? addDaysIso(endIsoRaw, -1) : (endIsoRaw || startIso);

    let cur = startIso;
    while (cur <= endIso) {
      rows.push({
        email,
        absence_date: cur,
        absence_type: type,
        note: summary || undefined,
      });
      cur = addDaysIso(cur, 1);
    }
  };

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      dtStart = null;
      dtEnd = null;
      attendeeEmail = null;
      organizerEmail = null;
      attendeeName = null;
      organizerName = null;
      summary = "";
      description = "";
      continue;
    }
    if (line === "END:VEVENT") {
      flushEvent();
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const [left, ...right] = line.split(":");
    const value = right.join(":").trim();
    const key = left.toUpperCase();

    if (key.startsWith("DTSTART")) dtStart = value;
    else if (key.startsWith("DTEND")) dtEnd = value;
    else if (key.startsWith("ATTENDEE")) {
      const m = value.match(/mailto:([^\s>]+)/i);
      if (m) attendeeEmail = m[1];
      const cn = left.match(/(?:^|;)CN=([^;]+)/i);
      if (cn) attendeeName = cn[1].replace(/^"|"$/g, "").trim();
    }
    else if (key.startsWith("ORGANIZER")) {
      const m = value.match(/mailto:([^\s>]+)/i);
      if (m) organizerEmail = m[1];
      const cn = left.match(/(?:^|;)CN=([^;]+)/i);
      if (cn) organizerName = cn[1].replace(/^"|"$/g, "").trim();
    }
    else if (key === "SUMMARY") summary = value;
    else if (key === "DESCRIPTION") description = value;
  }

  // Dedupe (same email/date can appear multiple times in exports)
  const uniq = new Map<string, ResourceAbsenceCsvRow>();
  for (const r of rows) uniq.set(`${r.email}|${r.absence_date}`, r);
  return [...uniq.values()];
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-[var(--radius)] border border-border bg-[var(--bg)] shadow-xl mx-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="font-semibold text-[14px] text-text">{title}</p>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] text-text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none focus:border-accent";

// ── Resource Form Modal ───────────────────────────────────────────────────────

function ResourceModal({
  initial,
  onClose,
}: {
  initial?: ExternalResource;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ExternalResourceCreate>({
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    email: initial?.email ?? "",
    company: initial?.company ?? "",
    role: initial?.role ?? "",
    daily_rate: initial?.daily_rate ?? 0,
    contract_start: initial?.contract_start ?? "",
    contract_end: initial?.contract_end ?? null,
    notes: initial?.notes ?? null,
  });
  const [error, setError] = useState("");

  const createMutation = useCreateTmResource();
  const updateMutation = useUpdateTmResource(initial?.id ?? "");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value || (k === "contract_end" || k === "notes" ? null : e.target.value) }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (initial) {
        await updateMutation.mutateAsync(form);
      } else {
        await createMutation.mutateAsync(form);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal title={initial ? "Modifica risorsa" : "Nuova risorsa"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome">
            <input className={inputCls} value={form.first_name} onChange={set("first_name")} required />
          </Field>
          <Field label="Cognome">
            <input className={inputCls} value={form.last_name} onChange={set("last_name")} required />
          </Field>
        </div>
        <Field label="Email (Atlassian)">
          <input className={inputCls} type="email" value={form.email} onChange={set("email")} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Società">
            <input className={inputCls} value={form.company} onChange={set("company")} required />
          </Field>
          <Field label="Ruolo">
            <input className={inputCls} value={form.role} onChange={set("role")} required />
          </Field>
        </div>
        <Field label="Costo giornaliero (€)">
          <input className={inputCls} type="number" min={0} step={0.01}
            value={form.daily_rate} onChange={(e) => setForm((f) => ({ ...f, daily_rate: parseFloat(e.target.value) || 0 }))} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Inizio contratto">
            <input className={inputCls} type="date" value={form.contract_start} onChange={set("contract_start")} required />
          </Field>
          <Field label="Fine contratto (opz.)">
            <input className={inputCls} type="date" value={form.contract_end ?? ""} onChange={set("contract_end")} />
          </Field>
        </div>
        <Field label="Note">
          <textarea className={inputCls + " resize-none"} rows={2} value={form.notes ?? ""} onChange={set("notes")} />
        </Field>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-muted hover:bg-hover">
            Annulla
          </button>
          <button type="submit" disabled={pending}
            className="px-4 py-2 text-[13px] rounded-[var(--radius-sm)] bg-accent text-white disabled:opacity-50">
            {pending ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Absence Modal ─────────────────────────────────────────────────────────────

function AbsenceModal({
  resourceId,
  resources,
  onClose,
}: {
  resourceId?: string;
  resources: ExternalResource[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    resource_id: resourceId ?? (resources[0]?.id ?? ""),
    absence_date: "",
    absence_type: "ferie",
    note: "",
  });
  const [error, setError] = useState("");
  const mutation = useCreateTmAbsence();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await mutation.mutateAsync({ ...form, note: form.note || null });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <Modal title="Aggiungi assenza" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Risorsa">
          <select className={inputCls} value={form.resource_id}
            onChange={(e) => setForm((f) => ({ ...f, resource_id: e.target.value }))}>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input className={inputCls} type="date" value={form.absence_date}
              onChange={(e) => setForm((f) => ({ ...f, absence_date: e.target.value }))} required />
          </Field>
          <Field label="Tipo">
            <select className={inputCls} value={form.absence_type}
              onChange={(e) => setForm((f) => ({ ...f, absence_type: e.target.value }))}>
              {ABSENCE_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Note (opz.)">
          <input className={inputCls} value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </Field>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-muted hover:bg-hover">
            Annulla
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="px-4 py-2 text-[13px] rounded-[var(--radius-sm)] bg-accent text-white disabled:opacity-50">
            {mutation.isPending ? "Salvataggio…" : "Aggiungi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Tab 1: Anagrafica ─────────────────────────────────────────────────────────

function AnagraficaTab() {
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editResource, setEditResource] = useState<ExternalResource | undefined>();
  const { data: resources = [], isLoading } = useTmResources(showInactive);
  const deactivate = useDeactivateTmResource();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[13px] text-text-muted cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostra risorse disattivate
        </label>
        <button
          onClick={() => { setEditResource(undefined); setModalOpen(true); }}
          className="px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] bg-accent text-white hover:opacity-90">
          + Aggiungi risorsa
        </button>
      </div>

      {isLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : resources.length === 0 ? (
        <p className="text-text-muted text-[13px]">Nessuna risorsa T&M configurata.</p>
      ) : (
        <div className="rounded-[var(--radius)] border border-border overflow-hidden">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th className="px-3 py-2 text-left text-text-muted font-normal">Nominativo</th>
                <th className="px-3 py-2 text-left text-text-muted font-normal hidden sm:table-cell">Email</th>
                <th className="px-3 py-2 text-left text-text-muted font-normal hidden md:table-cell">Società</th>
                <th className="px-3 py-2 text-left text-text-muted font-normal hidden md:table-cell">Ruolo</th>
                <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">Costo/gg</th>
                <th className="px-3 py-2 text-left text-text-muted font-normal hidden lg:table-cell">Contratto</th>
                <th className="px-3 py-2 text-center text-text-muted font-normal">Stato</th>
                <th className="px-3 py-2 text-right text-text-muted font-normal">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-hover">
                  <td className="px-3 py-2 text-text font-medium">{r.first_name} {r.last_name}</td>
                  <td className="px-3 py-2 text-text-muted hidden sm:table-cell">{r.email}</td>
                  <td className="px-3 py-2 text-text-dim hidden md:table-cell">{r.company}</td>
                  <td className="px-3 py-2 text-text-dim hidden md:table-cell">{r.role}</td>
                  <td className="px-3 py-2 text-right font-mono text-text">{fmtEur(r.daily_rate)}</td>
                  <td className="px-3 py-2 text-text-muted text-[12px] hidden lg:table-cell">
                    {r.contract_start}{r.contract_end ? ` → ${r.contract_end}` : " →"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{
                        background: r.is_active ? "color-mix(in srgb, var(--success) 15%, transparent)" : "color-mix(in srgb, var(--text-muted) 15%, transparent)",
                        color: r.is_active ? "var(--success)" : "var(--text-muted)",
                      }}>
                      {r.is_active ? "Attiva" : "Inattiva"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditResource(r); setModalOpen(true); }}
                        className="text-[12px] text-accent hover:underline">Modifica</button>
                      {r.is_active && (
                        <button onClick={() => deactivate.mutate(r.id)}
                          className="text-[12px] text-danger hover:underline">Disattiva</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ResourceModal initial={editResource} onClose={() => { setModalOpen(false); setEditResource(undefined); }} />
      )}
    </div>
  );
}

// ── Tab 2: Calendario Assenze ─────────────────────────────────────────────────

function days_in_month(year: number, month: number) {
  return new Date(year, month, 0).getDate(); // month is 1-based here
}

function is_weekend(year: number, month: number, day: number) {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

function CalendarioTab() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [addAbsence, setAddAbsence] = useState<{ resourceId?: string } | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const { data: resources = [], isLoading: loadingRes } = useTmResources();
  const { data: absences = [], isLoading: loadingAbs } = useTmAbsences({ year, month });
  const deleteAbsence = useDeleteTmAbsence();
  const syncMutation = useSyncConfluenceAbsences();
  const importCsvMutation = useImportTmAbsencesCsv();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const nDays = days_in_month(year, month);
  const absenceMap: Record<string, Record<number, ResourceAbsence>> = {};
  for (const a of absences) {
    const d = new Date(a.absence_date).getUTCDate();
    if (!absenceMap[a.resource_id]) absenceMap[a.resource_id] = {};
    absenceMap[a.resource_id][d] = a;
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  }

  async function handleSync() {
    setSyncMsg(null);
    const result = await syncMutation.mutateAsync({ year, month });
    setSyncMsg(`Sincronizzati ${result.synced} giorni da Confluence.${result.errors.length > 0 ? ` Errori: ${result.errors.join(", ")}` : ""}`);
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(null);
    try {
      const text = await file.text();
      const isIcs = file.name.toLowerCase().endsWith(".ics") || text.includes("BEGIN:VCALENDAR");
      const rows = isIcs ? parseAbsenceIcs(text, resources) : parseAbsenceCsv(text);
      if (rows.length === 0) {
        setImportMsg(isIcs ? "Nessun evento ICS associabile alle risorse (mancano email e nomi riconoscibili)." : "Nessuna riga valida trovata nel CSV.");
        return;
      }
      const result: CsvAbsenceImportResult = await importCsvMutation.mutateAsync(rows);
      setImportMsg(
        `Importate ${result.imported} righe, scartate ${result.skipped}.` +
        (result.errors.length > 0 ? ` Errori: ${result.errors.slice(0, 5).join(" | ")}` : "")
      );
    } catch (err: unknown) {
      setImportMsg(err instanceof Error ? err.message : "Errore durante import file");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-2 py-1 border border-border rounded text-[13px] hover:bg-hover">←</button>
          <span className="font-semibold text-[14px] text-text w-40 text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="px-2 py-1 border border-border rounded text-[13px] hover:bg-hover">→</button>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover cursor-pointer">
            ↑ Importa CSV/ICS
            <input type="file" accept=".csv,text/csv,.ics,text/calendar" className="hidden" onChange={handleFileImport} />
          </label>
          <button onClick={() => setAddAbsence({})}
            className="px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover">
            + Assenza manuale
          </button>
          <button onClick={handleSync} disabled={syncMutation.isPending}
            className="px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] bg-accent text-white disabled:opacity-50">
            {syncMutation.isPending ? "Sync…" : "↺ Sync Confluence"}
          </button>
        </div>
      </div>

      {syncMsg && (
        <p className="text-[12px] text-text-muted">{syncMsg}</p>
      )}

      {importMsg && (
        <p className="text-[12px] text-text-muted">{importMsg}</p>
      )}

      <p className="text-[11px] text-text-muted">
        Supporta CSV (<span className="font-mono">email</span>, <span className="font-mono">absence_date</span>, opzionali <span className="font-mono">absence_type</span>, <span className="font-mono">note</span>) e ICS (eventi con attendee/organizer email).
      </p>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {ABSENCE_TYPES.map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-[12px] text-text-dim">
            <div className="w-3 h-3 rounded-sm" style={{ background: ABSENCE_COLOR[t] }} />
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[12px] text-text-dim">
          <div className="w-3 h-3 rounded-sm bg-subtle" />
          WE / festivo
        </div>
      </div>

      {loadingRes || loadingAbs ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : resources.length === 0 ? (
        <p className="text-text-muted text-[13px]">Nessuna risorsa attiva.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-[11px] border-collapse min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[var(--bg)] z-10 px-3 py-2 text-left text-text-muted font-normal border-b border-border min-w-[140px]">
                  Risorsa
                </th>
                {Array.from({ length: nDays }, (_, i) => i + 1).map((d) => {
                  const we = is_weekend(year, month, d);
                  return (
                    <th key={d}
                      className="px-1 py-2 text-center font-mono border-b border-border"
                      style={{
                        color: we ? "var(--text-muted)" : "var(--text-dim)",
                        minWidth: 28,
                        background: we ? "color-mix(in srgb, var(--subtle) 60%, transparent)" : "transparent",
                      }}>
                      {d}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-hover/50">
                  <td className="sticky left-0 bg-[var(--bg)] z-10 px-3 py-1.5 text-text-dim whitespace-nowrap border-r border-border">
                    {r.first_name} {r.last_name}
                  </td>
                  {Array.from({ length: nDays }, (_, i) => i + 1).map((d) => {
                    const we = is_weekend(year, month, d);
                    const absence = absenceMap[r.id]?.[d];
                    return (
                      <td key={d}
                        className="px-0.5 py-1 text-center relative group"
                        style={{
                          background: we
                            ? "color-mix(in srgb, var(--subtle) 40%, transparent)"
                            : absence
                              ? `color-mix(in srgb, ${ABSENCE_COLOR[absence.absence_type] ?? "var(--text-muted)"} 20%, transparent)`
                              : "transparent",
                        }}>
                        {absence && (
                          <div
                            className="w-4 h-4 rounded-sm mx-auto cursor-pointer hover:opacity-70 transition-opacity"
                            style={{ background: ABSENCE_COLOR[absence.absence_type] ?? "var(--text-muted)" }}
                            title={`${absence.absence_type} (${absence.source})\nClicca per rimuovere`}
                            onClick={() => {
                              if (absence.source === "manual") deleteAbsence.mutate(absence.id);
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addAbsence && (
        <AbsenceModal resources={resources} onClose={() => setAddAbsence(null)} />
      )}
    </div>
  );
}

// ── Tab 3: Riepilogo Costi ────────────────────────────────────────────────────

function CostsTab() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const { data: report, isLoading } = useTmCostReport(year, month);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  }

  function downloadCsv() {
    if (!report) return;
    const header = ["Nominativo", "Società", "Ruolo", "Giorni lav.", "Assenze", "Giorni fatt.", "Costo/gg (€)", "Totale (€)"];
    const rows = report.rows.map((r: ResourceCostRow) => [
      r.full_name, r.company, r.role, r.working_days, r.absence_days,
      r.billable_days, r.daily_rate.toFixed(2), r.total_cost.toFixed(2),
    ]);
    rows.push(["TOTALE", "", "", "", "", "", "", report.grand_total.toFixed(2)]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `costi_tm_${year}_${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-2 py-1 border border-border rounded text-[13px] hover:bg-hover">←</button>
          <span className="font-semibold text-[14px] text-text w-40 text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="px-2 py-1 border border-border rounded text-[13px] hover:bg-hover">→</button>
        </div>
        {report && report.rows.length > 0 && (
          <button onClick={downloadCsv}
            className="px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover">
            ↓ Esporta CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : !report || report.rows.length === 0 ? (
        <p className="text-text-muted text-[13px]">Nessuna risorsa attiva con contratto in questo periodo.</p>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-4 min-w-[130px]">
              <span className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>Risorse</span>
              <span className="text-2xl font-semibold text-text">{report.rows.length}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-4 min-w-[130px]">
              <span className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>Totale assenze</span>
              <span className="text-2xl font-semibold text-text">
                {report.rows.reduce((s: number, r: ResourceCostRow) => s + r.absence_days, 0)}gg
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-4 min-w-[160px]">
              <span className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>Costo totale</span>
              <span className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>
                {fmtEur(report.grand_total)}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-[var(--radius)] border border-border overflow-hidden">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-subtle">
                  <th className="px-3 py-2 text-left text-text-muted font-normal">Nominativo</th>
                  <th className="px-3 py-2 text-left text-text-muted font-normal hidden md:table-cell">Società</th>
                  <th className="px-3 py-2 text-left text-text-muted font-normal hidden lg:table-cell">Ruolo</th>
                  <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">Gg lav.</th>
                  <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">Assenze</th>
                  <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">Gg fatt.</th>
                  <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">€/gg</th>
                  <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">Totale</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r: ResourceCostRow) => (
                  <tr key={r.resource_id} className="border-b border-border last:border-0 hover:bg-hover">
                    <td className="px-3 py-2 text-text font-medium">{r.full_name}</td>
                    <td className="px-3 py-2 text-text-dim hidden md:table-cell">{r.company}</td>
                    <td className="px-3 py-2 text-text-muted hidden lg:table-cell">{r.role}</td>
                    <td className="px-3 py-2 text-right font-mono text-text-dim">{r.working_days}</td>
                    <td className="px-3 py-2 text-right font-mono"
                      style={{ color: r.absence_days > 0 ? "var(--warning)" : "var(--text-muted)" }}>
                      {r.absence_days}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-text">{r.billable_days}</td>
                    <td className="px-3 py-2 text-right font-mono text-text-muted">{fmtEur(r.daily_rate)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-text">{fmtEur(r.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-subtle">
                  <td className="px-3 py-2 font-semibold text-text" colSpan={7}>Totale</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: "var(--accent)" }}>
                    {fmtEur(report.grand_total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ["Anagrafica", "Calendario Assenze", "Riepilogo Costi"] as const;
type Tab = (typeof TABS)[number];

export default function TmResourcesPage() {
  const [tab, setTab] = useState<Tab>("Anagrafica");

  return (
    <RouteGuard action="manage:integrations">
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-text">Risorse T&M</h1>

        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 text-[13px] transition-colors border-b-2 -mb-px"
              style={{
                borderColor: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "var(--accent)" : "var(--text-dim)",
                fontWeight: tab === t ? 500 : 400,
              }}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Anagrafica" && <AnagraficaTab />}
        {tab === "Calendario Assenze" && <CalendarioTab />}
        {tab === "Riepilogo Costi" && <CostsTab />}
      </div>
    </RouteGuard>
  );
}
