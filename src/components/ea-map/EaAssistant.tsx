"use client";

/* «Pagoda» (formerly «Chiedi alla mappa»): an assistant that floats over every view of the EA Map. It answers
   from the graph through read-only tools on the backend (Gemini with function calling),
   lights up on the map the nodes it talks about and turns [[node-id]] references into
   chips that open the node. */

import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CornerDownLeft, EyeOff, MapPin, Trash2, X } from "lucide-react";
import type { EaChatMessage } from "@/types/ea";
import { useEaAssistant } from "@/hooks/useEaMap";
import { errorMessage, parseAnswer, type Inline } from "@/lib/ea-map/assist";
import type { EaGraph, EaRoute } from "@/lib/ea-map/graph";
import { cx } from "./shared";
import { PagodaAvatar } from "./EaPagoda";
import s from "./ea-assist.module.css";

interface Turn extends EaChatMessage {
  labels?: Record<string, string>;
  steps?: { tool: string; label: string }[];
  highlight?: string[];
  error?: boolean;
}

const SUGGESTIONS = [
  "Se cambio GPD, chi si rompe?",
  "Quali microservizi del Nodo non hanno test di integrazione?",
  "Da cosa dipende il Checkout?",
  "Quali processi SANP passano dal WISP Converter?",
];

interface Props {
  g: EaGraph;
  route: EaRoute;
  highlightOn: boolean;
  onHighlight: (ids: string[] | null) => void;
  onShow: (ids: string[]) => void;
  openNode: (id: string) => void;
}

function Rich({ text, labels, g, openNode }: { text: string; labels: Record<string, string>; g: EaGraph; openNode: (id: string) => void }) {
  const run = (inl: Inline[]) =>
    inl.map((x, i) => {
      if (x.t === "bold") return <b key={i}>{x.v}</b>;
      if (x.t === "text") return <Fragment key={i}>{x.v}</Fragment>;
      const label = labels[x.id] ?? g.byId.get(x.id)?.name ?? x.id;
      const onMap = g.byId.has(x.id);
      return (
        <button key={i} type="button" className={s.ref} title={onMap ? `Apri ${label}` : label}
          onClick={() => onMap && openNode(x.id)} disabled={!onMap}>
          {label}
        </button>
      );
    });
  return (
    <>
      {parseAnswer(text).map((b, i) =>
        b.t === "p" ? <p key={i}>{run(b.inl)}</p> : <ul key={i}>{b.items.map((it, j) => <li key={j}>{run(it)}</li>)}</ul>,
      )}
    </>
  );
}

export function EaAssistant({ g, route, highlightOn, onHighlight, onShow, openNode }: Props) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const ask = useEaAssistant();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, ask.isPending]);

  const contextNode = route.nodeId ? g.byId.get(route.nodeId) : undefined;

  const send = (text: string) => {
    const q = text.trim();
    if (!q || ask.isPending) return;
    const history: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(history);
    setDraft("");
    ask.mutate(
      {
        messages: history.filter((t) => !t.error).map(({ role, content }) => ({ role, content })),
        context: { view: route.view, node_id: route.nodeId },
      },
      {
        onSuccess: (r) => {
          setTurns((t) => [...t, { role: "assistant", content: r.answer, labels: r.labels, steps: r.steps, highlight: r.highlight }]);
          onHighlight(r.highlight.length ? r.highlight : null);
        },
        onError: (err) =>
          setTurns((t) => [
            ...t,
            { role: "assistant", content: errorMessage(err, "L’assistente non ha risposto, riprova tra poco."), error: true },
          ]),
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  };

  if (!open) {
    return (
      <div className={s.dock}>
        <button type="button" className={s.fab} onClick={() => setOpen(true)} aria-label="Chiedi a Pagoda (Ctrl+J)">
          <span className={s.fabAvatar}><PagodaAvatar size={38} /></span>
          <span className={s.fabText}>
            <b>Chiedi a Pagoda</b>
            <small>l&apos;assistente della mappa</small>
          </span>
        </button>
      </div>
    );
  }

  return (
    <section className={s.panel} role="dialog" aria-label="Pagoda, assistente della EA Map">
      <header className={s.head}>
        <span className={s.headAvatar}><PagodaAvatar size={40} thinking={ask.isPending} /></span>
        <div className={s.headT}>
          <b>Pagoda</b>
          <span>L&apos;assistente della mappa EA · risponde dai dati, non a memoria</span>
        </div>
        {turns.length > 0 && (
          <button type="button" className={s.icon} onClick={() => { setTurns([]); onHighlight(null); }} title="Nuova conversazione">
            <Trash2 aria-hidden="true" />
          </button>
        )}
        <button type="button" className={s.icon} onClick={() => setOpen(false)} title="Chiudi (Esc)">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className={s.body} ref={listRef}>
        {turns.length === 0 && (
          <div className={s.empty}>
            <div className={s.hello}>
              <PagodaAvatar size={72} className={s.helloAvatar} />
              <div className={s.bubble}>
                <b>Ciao! Sono Pagoda e posso aiutarti a leggere la mappa EA.</b>
                <span>
                  Chiedimi di dipendenze, impatti, copertura dei test o processi SANP, oppure incolla il link di
                  una pull request.
                </span>
              </div>
            </div>
            <div className={s.sugg}>
              {SUGGESTIONS.map((q) => (
                <button key={q} type="button" onClick={() => send(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className={s.user}>{t.content}</div>
          ) : (
            <div key={i} className={cx(s.bot, t.error && s.botErr)}>
              <PagodaAvatar size={26} className={s.botAvatar} />
              <div className={s.botBody}>
              {t.steps && t.steps.length > 0 && (
                <details className={s.steps}>
                  <summary>Come ho risposto · {t.steps.length} passaggi</summary>
                  <ol>{t.steps.map((st, j) => <li key={j}>{st.label}</li>)}</ol>
                </details>
              )}
              <div className={s.answer}>
                <Rich text={t.content} labels={t.labels ?? {}} g={g} openNode={openNode} />
              </div>
              {t.highlight && t.highlight.length > 0 && (
                <div className={s.actions}>
                  <button type="button" onClick={() => onShow(t.highlight!)}>
                    <MapPin aria-hidden="true" /> Mostra sulla mappa ({t.highlight.length})
                  </button>
                  {highlightOn && i === turns.length - 1 && (
                    <button type="button" onClick={() => onHighlight(null)}>
                      <EyeOff aria-hidden="true" /> Spegni evidenziazione
                    </button>
                  )}
                </div>
              )}
              </div>
            </div>
          ),
        )}
        {ask.isPending && (
          <div className={cx(s.bot, s.thinking)}>
            <PagodaAvatar size={26} thinking className={s.botAvatar} />
            <span>Pagoda sta consultando la mappa…</span>
          </div>
        )}
      </div>

      <footer className={s.foot}>
        {contextNode && (
          <span className={s.ctx} title="L’assistente sa cosa stai guardando">Stai guardando: {contextNode.name}</span>
        )}
        <div className={s.input}>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            placeholder="Chiedi a Pagoda o incolla il link di una PR…"
            aria-label="Domanda per Pagoda"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="button" className={s.send} onClick={() => send(draft)} disabled={!draft.trim() || ask.isPending} aria-label="Invia">
            <CornerDownLeft aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>
  );
}
