interface BrandMarkProps {
  glyph?: string;
  size?: number;
  className?: string;
}

export function BrandMark({ glyph = "QA", size = 28, className }: BrandMarkProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 6,
        background: "var(--accent)",
        color: "var(--accent-fg)",
        fontFamily: "var(--font-geist-mono, monospace)",
        fontWeight: 700,
        fontSize: Math.round(size * 0.4),
        letterSpacing: "-0.02em",
        userSelect: "none",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {glyph.slice(0, 2)}
    </span>
  );
}
