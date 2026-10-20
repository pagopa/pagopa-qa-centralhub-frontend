import { Loader2, Save } from "lucide-react";

interface NrtSaveButtonProps {
  hasSaveError: boolean;
  onSave: () => void;
  isSaving: boolean;
  modified: boolean;
}

export default function NrtSaveButton({
  hasSaveError,
  onSave,
  isSaving,
  modified,
}: NrtSaveButtonProps) {
  return (
    <>
      {hasSaveError && (
        <p role="alert" className="text-[12px] text-danger">
          Errore durante il salvataggio delle modifiche.
        </p>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || !modified}
        className="inline-flex hover:bg-accent-dark items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-[13px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "var(--accent)" }}
      >
        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {isSaving ? "Salvataggio…" : "Salva modifiche"}
      </button>
    </>
  );
}