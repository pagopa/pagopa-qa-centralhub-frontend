// qa-hub-frontend/src/components/psp-fees/PspFeeFilters.tsx
"use client";

export interface PspFeeChannelFilters {
  carte: boolean;
  conto: boolean;
  on_us: boolean;
  altri_wisp: boolean;
  altri_io: boolean;
  conto_app: boolean;
  carte_app: boolean;
}

export interface PspFeeFiltersState {
  search: string;
  amount: string;
  channels: PspFeeChannelFilters;
}

export const DEFAULT_PSP_FEE_FILTERS: PspFeeFiltersState = {
  search: "",
  amount: "",
  channels: {
    carte: false,
    conto: false,
    on_us: false,
    altri_wisp: false,
    altri_io: false,
    conto_app: false,
    carte_app: false,
  },
};

const CHANNEL_OPTIONS: { key: keyof PspFeeChannelFilters; label: string }[] = [
  { key: "carte", label: "Carte" },
  { key: "conto", label: "Conto" },
  { key: "on_us", label: "On Us" },
  { key: "altri_wisp", label: "Altri WISP" },
  { key: "altri_io", label: "IO" },
  { key: "conto_app", label: "Conto App" },
  { key: "carte_app", label: "Carte App" },
];

interface PspFeeFiltersProps {
  filters: PspFeeFiltersState;
  onChange: (filters: PspFeeFiltersState) => void;
}

export function PspFeeFilters({ filters, onChange }: PspFeeFiltersProps) {
  const toggleChannel = (key: keyof PspFeeChannelFilters) => {
    onChange({
      ...filters,
      channels: { ...filters.channels, [key]: !filters.channels[key] },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="🔍 Cerca PSP/servizio…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-3 py-1.5 min-w-[240px]"
        />
        <input
          type="number"
          placeholder="Importo"
          value={filters.amount}
          onChange={(e) => onChange({ ...filters, amount: e.target.value })}
          className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-3 py-1.5 w-32"
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap text-[12px] text-text-dim">
        <span
          className="text-text-muted font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: ".06em" }}
        >
          Canali
        </span>
        {CHANNEL_OPTIONS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.channels[key]}
              onChange={() => toggleChannel(key)}
              className="cursor-pointer"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
