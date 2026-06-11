"use client";

import { useState } from "react";
import {
  ExternalLink,
  FileText,
  Globe,
  BookOpen,
  LayoutTemplate,
  Video,
  X,
  ArrowUpRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { useDocItems, useCreateDocItem, useUpdateDocItem, useDeleteDocItem } from "@/hooks/useDocs";
import type { DocItem, DocIcon, DocType } from "@/types/index";
import { RouteGuard } from "@/components/auth/RouteGuard";

const ICONS: Record<DocIcon, React.ElementType> = {
  confluence: BookOpen,
  page: FileText,
  template: LayoutTemplate,
  web: Globe,
  video: Video,
};

const ICON_OPTIONS: { value: DocIcon; label: string }[] = [
  { value: "confluence", label: "Confluence" },
  { value: "page", label: "Pagina" },
  { value: "template", label: "Template" },
  { value: "web", label: "Web / Report" },
  { value: "video", label: "Video" },
];

function faviconUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}

const EMPTY_FORM = {
  title: "",
  description: "",
  url: "",
  type: "external" as DocType,
  category: "",
  icon: "page" as DocIcon,
  thumbnail_url: "",
  position: 0,
};

export default function DocsPage() {
  const { data: items = [], isLoading } = useDocItems();
  const [viewer, setViewer] = useState<DocItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocItem | null>(null);

  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean))
  ).sort();

  const grouped = categories.reduce<Record<string, DocItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat).sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (item: DocItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  if (isLoading) return <p className="text-text-muted text-[13px]">Caricamento…</p>;

  return (
    <RouteGuard action="view:docs">
    <>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-text-dim">
            {items.length === 0
              ? "Nessun contenuto ancora. Aggiungi il primo link."
              : `${items.length} element${items.length === 1 ? "o" : "i"}`}
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] font-medium transition-colors"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <Plus size={14} />
            Aggiungi
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="rounded-[var(--radius)] border border-dashed border-border p-12 flex flex-col items-center gap-3 text-center">
            <FileText size={28} strokeWidth={1.2} style={{ color: "var(--text-muted)" }} />
            <p className="text-[13px] text-text-muted">
              Aggiungi link a pagine Confluence, report HTML, template e altro.
            </p>
          </div>
        )}

        {/* Grouped tiles */}
        {categories.map((cat) => (
          <section key={cat}>
            <p
              className="text-[11px] font-mono uppercase text-text-muted mb-3"
              style={{ letterSpacing: ".08em" }}
            >
              {cat}
            </p>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
            >
              {grouped[cat].map((item) => (
                <TileCard
                  key={item.id}
                  item={item}
                  onOpen={setViewer}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {viewer && <EmbedModal item={viewer} onClose={() => setViewer(null)} />}

      {formOpen && (
        <ItemFormModal
          initial={editing}
          onClose={() => setFormOpen(false)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
    </RouteGuard>
  );
}

// ── Tile card ─────────────────────────────────────────────────────────────────

function TileCard({
  item,
  onOpen,
  onEdit,
  onDelete,
}: {
  item: DocItem;
  onOpen: (i: DocItem) => void;
  onEdit: (i: DocItem) => void;
  onDelete: (i: DocItem) => void;
}) {
  const Icon = ICONS[item.icon] ?? FileText;
  const isEmbedded = item.type === "embedded";
  const favicon = faviconUrl(item.url);

  const handleClick = () => {
    if (isEmbedded) onOpen(item);
    else window.open(item.url, "_blank", "noopener");
  };

  return (
    <div className="group relative rounded-[var(--radius)] border border-border bg-surface flex flex-col h-full overflow-hidden">
      {/* Action buttons — visible on hover */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(item)}
          className="grid place-items-center w-6 h-6 rounded-[var(--radius-sm)] bg-surface border border-border text-text-muted hover:text-text hover:bg-hover transition-colors"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={() => onDelete(item)}
          className="grid place-items-center w-6 h-6 rounded-[var(--radius-sm)] bg-surface border border-border text-text-muted hover:text-danger hover:bg-hover transition-colors"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Clickable area */}
      <button onClick={handleClick} className="text-left flex flex-col flex-1 transition-colors hover:bg-hover">
        {/* Cover */}
        {item.thumbnail_url ? (
          <div className="w-full shrink-0 overflow-hidden" style={{ height: 110 }}>
            <img
              src={item.thumbnail_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        ) : (
          <div
            className="w-full shrink-0 flex items-center justify-center"
            style={{
              height: 72,
              background: isEmbedded
                ? "color-mix(in oklch, var(--accent) 8%, var(--surface))"
                : "var(--subtle)",
            }}
          >
            {favicon ? (
              <img
                src={favicon}
                alt=""
                width={32}
                height={32}
                className="rounded-[6px] opacity-75 group-hover:opacity-100 transition-opacity"
              />
            ) : (
              <Icon
                size={22}
                strokeWidth={1.5}
                style={{ color: isEmbedded ? "var(--accent)" : "var(--text-muted)", opacity: 0.6 }}
              />
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex flex-col gap-3 p-4 flex-1">
          <div className="flex items-center justify-between gap-2">
            {item.thumbnail_url && favicon ? (
              <img src={favicon} alt="" width={16} height={16} className="rounded-[3px] shrink-0" />
            ) : (
              <span />
            )}
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0"
              style={{
                color: isEmbedded ? "var(--accent)" : "var(--text-muted)",
                borderColor: isEmbedded ? "var(--accent)" : "var(--border)",
                background: isEmbedded
                  ? "color-mix(in oklch, var(--accent) 8%, transparent)"
                  : "transparent",
              }}
            >
              {isEmbedded ? "inline" : "link"}
            </span>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <p className="font-semibold text-[13px] text-text">{item.title}</p>
            {item.description && (
              <p className="text-[12px] text-text-dim">{item.description}</p>
            )}
          </div>

          <div
            className="flex items-center gap-1 text-[12px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {isEmbedded ? (
              <>
                Apri nel portale{" "}
                <ArrowUpRight size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </>
            ) : (
              <>Apri <ExternalLink size={11} /></>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

// ── Embed modal ───────────────────────────────────────────────────────────────

function EmbedModal({ item, onClose }: { item: DocItem; onClose: () => void }) {
  const proxyUrl = `/api/v1/docs/proxy?url=${encodeURIComponent(item.url)}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg)" }}>
      <div
        className="flex items-center gap-3 px-4 border-b border-border shrink-0"
        style={{ height: "var(--topbar-h)", background: "var(--surface)" }}
      >
        <button
          onClick={onClose}
          className="grid place-items-center rounded-[var(--radius-sm)] border border-border w-7 h-7 text-text-muted hover:text-text hover:bg-hover transition-colors"
        >
          <X size={14} />
        </button>
        <span className="text-[13px] font-semibold text-text flex-1">{item.title}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text transition-colors no-underline"
        >
          <ExternalLink size={12} />
          Apri in nuova tab
        </a>
      </div>
      <iframe src={proxyUrl} title={item.title} className="flex-1 w-full border-0" />
    </div>
  );
}

// ── Create / Edit form modal ──────────────────────────────────────────────────

function ItemFormModal({
  initial,
  onClose,
}: {
  initial: DocItem | null;
  onClose: () => void;
}) {
  const create = useCreateDocItem();
  const update = useUpdateDocItem();
  const isPending = create.isPending || update.isPending;

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    url: initial?.url ?? "",
    type: initial?.type ?? ("external" as DocType),
    category: initial?.category ?? "",
    icon: initial?.icon ?? ("page" as DocIcon),
    thumbnail_url: initial?.thumbnail_url ?? "",
    position: initial?.position ?? 0,
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      description: form.description || null,
      thumbnail_url: form.thumbnail_url || null,
    };
    if (initial) {
      await update.mutateAsync({ id: initial.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div
        className="rounded-[var(--radius)] border border-border bg-surface flex flex-col w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="font-semibold text-[14px] text-text">
            {initial ? "Modifica" : "Nuovo contenuto"}
          </p>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <Field label="Titolo *">
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputCls}
              placeholder="Es. Strategia di Test"
            />
          </Field>

          <Field label="Descrizione">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Breve descrizione del contenuto"
            />
          </Field>

          <Field label="URL *">
            <input
              required
              type="url"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                <option value="external">Link esterno</option>
                <option value="embedded">Inline (iframe)</option>
              </select>
            </Field>
            <Field label="Icona">
              <select value={form.icon} onChange={(e) => set("icon", e.target.value)} className={inputCls}>
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Categoria">
            <input
              required
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={inputCls}
              placeholder="Es. Processi & Guide"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              <option value="Processi & Guide" />
              <option value="Template" />
              <option value="Report & Dashboard" />
              <option value="Formazione" />
            </datalist>
          </Field>

          <Field label="Thumbnail URL (opzionale)">
            <input
              type="url"
              value={form.thumbnail_url}
              onChange={(e) => set("thumbnail_url", e.target.value)}
              className={inputCls}
              placeholder="https://... (immagine di copertina)"
            />
          </Field>

          <Field label="Posizione">
            <input
              type="number"
              min={0}
              value={form.position}
              onChange={(e) => set("position", parseInt(e.target.value) || 0)}
              className={inputCls}
            />
          </Field>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] rounded-[var(--radius-sm)] font-medium disabled:opacity-50 transition-colors"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              {initial ? "Salva" : "Crea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

function DeleteModal({ item, onClose }: { item: DocItem; onClose: () => void }) {
  const del = useDeleteDocItem();

  const confirm = async () => {
    await del.mutateAsync(item.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div
        className="rounded-[var(--radius)] border border-border bg-surface p-6 flex flex-col gap-4 w-full max-w-sm"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      >
        <p className="font-semibold text-[14px] text-text">Elimina contenuto</p>
        <p className="text-[13px] text-text-dim">
          Sei sicuro di voler eliminare <strong className="text-text">"{item.title}"</strong>? L'operazione non è reversibile.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={confirm}
            disabled={del.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] rounded-[var(--radius-sm)] font-medium disabled:opacity-50 transition-colors"
            style={{ background: "var(--danger)", color: "#fff" }}
          >
            {del.isPending && <Loader2 size={12} className="animate-spin" />}
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  "rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none focus:border-[var(--accent)] w-full";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] text-text-muted">{label}</p>
      {children}
    </div>
  );
}
