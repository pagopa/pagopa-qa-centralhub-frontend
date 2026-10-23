export  function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
    return (
      <div>
        <dt className="text-text-muted">{label}</dt>
        <dd className="text-text">{value || "—"}</dd>
      </div>
    );
  }