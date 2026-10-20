import { ChevronLeft, ChevronRight } from "lucide-react";

interface NrtPaginationProps {
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
}

export default function NrtPagination({ page, totalPages, setPage }: NrtPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
        aria-label="Pagina precedente"
        className="disabled:opacity-40 text-text-muted hover:text-text transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-[12px] text-text-muted font-mono">
        {page} / {totalPages}
      </span>
      <button
        disabled={page === totalPages}
        onClick={() => setPage(page + 1)}
        aria-label="Pagina successiva"
        className="disabled:opacity-40 text-text-muted hover:text-text transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}