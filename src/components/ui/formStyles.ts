// Shared look for native form controls. Inputs and selects do not inherit the
// page font by default, which is why they looked "basic": force the app font
// and give them a consistent height, focus ring and custom select arrow.
const CHEVRON =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394959c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-no-repeat bg-[position:right_10px_center]";

export const FIELD_BASE_CLASS =
  "h-9 rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text " +
  "font-sans text-[14px] leading-none px-3 shadow-[var(--shadow-sm)] transition " +
  "placeholder:text-text-muted hover:border-text-muted " +
  "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 " +
  "disabled:opacity-50";

export const INPUT_CLASS = FIELD_BASE_CLASS;

export const SELECT_CLASS = `${FIELD_BASE_CLASS} appearance-none pr-8 cursor-pointer ${CHEVRON}`;

export const PRIMARY_BUTTON_CLASS =
  "h-9 inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 " +
  "font-sans text-[14px] font-medium text-white shadow-[var(--shadow-sm)] transition " +
  "hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const SECONDARY_BUTTON_CLASS =
  "h-9 inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-strong " +
  "bg-surface px-3 font-sans text-[14px] text-text shadow-[var(--shadow-sm)] transition " +
  "hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";
