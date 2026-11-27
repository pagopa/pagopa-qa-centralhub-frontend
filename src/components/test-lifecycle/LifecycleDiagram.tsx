/** Diagramma del ciclo di vita di una feature: passi nell'hub e passi su GitHub. */

const NODE_W = 150;
const NODE_H = 46;

function Node({ x, y, label, sub, accent = false }: { x: number; y: number; label: string; sub?: string; accent?: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={10}
        fill={accent ? "var(--accent-soft)" : "var(--surface)"}
        stroke={accent ? "var(--accent)" : "var(--border-strong)"}
        strokeWidth={1.5}
      />
      <text x={x + NODE_W / 2} y={sub ? y + 20 : y + 28} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--text)">
        {label}
      </text>
      {sub && (
        <text x={x + NODE_W / 2} y={y + 36} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
          {sub}
        </text>
      )}
    </g>
  );
}

function Label({ x, y, children, anchor = "middle" }: { x: number; y: number; children: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={12} fill="var(--text-dim)">
      {children}
    </text>
  );
}

function JiraTag({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g>
      <rect x={x} y={y} width={NODE_W} height={18} rx={9} fill="var(--info-soft)" />
      <text x={x + NODE_W / 2} y={y + 13} textAnchor="middle" fontSize={10} fill="var(--info)">
        {text}
      </text>
    </g>
  );
}

export function LifecycleDiagram() {
  const hubY = 110;
  const gitY = 262;
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-[var(--bg)] p-3">
      <svg
        role="img"
        aria-label="Diagramma del ciclo di vita di una feature"
        viewBox="0 0 960 345"
        className="min-w-[760px] w-full h-auto"
      >
        <title>Diagramma del ciclo di vita di una feature</title>
        <defs>
          <marker id="tl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--text-muted)" />
          </marker>
        </defs>

        {/* corsie */}
        <rect x={4} y={44} width={952} height={150} rx={12} fill="var(--surface)" opacity={0.35} />
        <text x={14} y={64} fontSize={12} fontWeight={700} fill="var(--text-muted)">QA HUB</text>
        <rect x={4} y={214} width={952} height={124} rx={12} fill="var(--neutral-soft)" opacity={0.5} />
        <text x={14} y={234} fontSize={12} fontWeight={700} fill="var(--text-muted)">GITHUB (repo dei test)</text>

        {/* nodi hub */}
        <Node x={20} y={hubY} label="Bozza" sub="QA Analyst progetta" />
        <Node x={215} y={hubY} label="In review" sub="Reviewer valuta" />
        <Node x={410} y={hubY} label="Progettata" sub="revisione approvata" />
        <Node x={785} y={hubY} label="Implementata" sub="+ badge In esecuzione NRT" accent />

        {/* nodi GitHub */}
        <Node x={410} y={gitY} label="PR aperta" sub="creata dall'hub" />
        <Node x={600} y={gitY} label="Merge su main" sub="team QA su GitHub" />
        <Node x={785} y={gitY} label="Modifica su main" sub="push diretto" />

        {/* flusso principale */}
        <line x1={170} y1={hubY + 14} x2={213} y2={hubY + 14} stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#tl-arrow)" />
        <line x1={213} y1={hubY + 32} x2={172} y2={hubY + 32} stroke="var(--warning)" strokeWidth={1.5} markerEnd="url(#tl-arrow)" />
        <Label x={175} y={hubY + 62} anchor="start">Invia →</Label>
        <Label x={175} y={hubY + 77} anchor="start">← Ritira</Label>
        <line x1={365} y1={hubY + 14} x2={408} y2={hubY + 14} stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#tl-arrow)" />
        <line x1={408} y1={hubY + 32} x2={367} y2={hubY + 32} stroke="var(--warning)" strokeWidth={1.5} markerEnd="url(#tl-arrow)" />
        <Label x={387} y={hubY + 62}>Approva →</Label>
        <Label x={387} y={hubY + 77}>← Riporta</Label>

        <line x1={485} y1={hubY + NODE_H} x2={485} y2={gitY - 2} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#tl-arrow)" />
        <Label x={492} y={gitY - 40} anchor="start">PR automatica</Label>

        <line x1={560} y1={gitY + 23} x2={598} y2={gitY + 23} stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#tl-arrow)" />

        <path d={`M675,${gitY} L675,${hubY + 23} L783,${hubY + 23}`} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#tl-arrow)" />
        <Label x={682} y={hubY + 70} anchor="start">Sync</Label>
        <Label x={682} y={hubY + 85} anchor="start">(ogni 5 min</Label>
        <Label x={682} y={hubY + 100} anchor="start">o manuale)</Label>

        <line x1={860} y1={gitY} x2={860} y2={hubY + NODE_H + 2} stroke="var(--warning)" strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#tl-arrow)" />
        <Label x={868} y={gitY - 50} anchor="start">Sync: nuova</Label>
        <Label x={868} y={gitY - 35} anchor="start">versione o</Label>
        <Label x={868} y={gitY - 20} anchor="start">anomalia</Label>

        {/* task Jira */}
        <JiraTag x={20} y={hubY + NODE_H + 6} text="task Jira Progettazione" />
        <JiraTag x={410} y={hubY - 24} text="task Jira Implementazione" />

        {/* ritorni */}
        <path d={`M290,${hubY} C290,72 110,72 110,${hubY - 2}`} fill="none" stroke="var(--warning)" strokeWidth={1.5} markerEnd="url(#tl-arrow)" />
        <Label x={200} y={84}>Richiedi modifiche</Label>

        <path d={`M860,${hubY} C860,14 60,14 60,${hubY - 2}`} fill="none" stroke="var(--info)" strokeWidth={1.5} markerEnd="url(#tl-arrow)" />
        <Label x={470} y={32}>Riapri → nuova bozza (se Git è cambiato: Riallinea)</Label>
      </svg>
    </div>
  );
}
