"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Upload, Loader2 } from "lucide-react";
import { GherkinEditor } from "@/components/bdd/GherkinEditor";
import { TagManager } from "@/components/bdd/TagManager";
import { useCreateBddScenario } from "@/hooks/useBdd";
import type { BddSourceType, BddStatus, BddGeneratedScenario } from "@/types/index";

const STEPS = ["Sorgente", "Requisito", "Generazione", "Revisione"] as const;

const SOURCE_OPTIONS: { type: BddSourceType; label: string; description: string }[] = [
  { type: "text", label: "Testo libero", description: "Incolla il requisito direttamente" },
  { type: "url", label: "URL", description: "Pagina web o documento via link" },
  { type: "confluence", label: "Confluence", description: "Pagina Confluence via URL" },
  { type: "pdf", label: "PDF", description: "Carica un documento PDF" },
  { type: "docx", label: "Word (DOCX)", description: "Carica un documento Word" },
];

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function BddNewScenarioPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const createScenario = useCreateBddScenario();

  const [step, setStep] = useState(0);
  const [sourceType, setSourceType] = useState<BddSourceType>("text");
  const [url, setUrl] = useState("");
  const [fileRef, setFileRef] = useState<{ bytes: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [requirementText, setRequirementText] = useState("");
  const [title, setTitle] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [generatedScenarios, setGeneratedScenarios] = useState<BddGeneratedScenario[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [aiProvider, setAiProvider] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [genTimeMs, setGenTimeMs] = useState<number | null>(null);

  const [gherkin, setGherkin] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<BddStatus>("draft");
  const [saving, setSaving] = useState(false);

  const handleLoadSource = async () => {
    setParsing(true);
    setParseError("");
    try {
      if (sourceType === "pdf" || sourceType === "docx") {
        if (!fileRef) throw new Error("Nessun file caricato");
        const form = new FormData();
        form.append("source_type", sourceType);
        const blob = new Blob([Uint8Array.from(atob(fileRef.bytes), (c) => c.charCodeAt(0))]);
        form.append("file", new File([blob], fileRef.name));
        const resp = await fetch(`${BASE_URL}/api/v1/bdd/parse/file`, { method: "POST", body: form });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        setRequirementText(data.text);
      } else {
        const resp = await fetch(`${BASE_URL}/api/v1/bdd/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_type: sourceType, url }),
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        setRequirementText(data.text);
      }
      setStep(1);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Errore sconosciuto");
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setFileRef({ bytes: base64, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setStreamText("");
    setGeneratedScenarios([]);
    setStep(2);

    try {
      const resp = await fetch(`${BASE_URL}/api/v1/bdd/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement: requirementText, title, language: "it" }),
      });
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.error) throw new Error(event.error);
            if (event.chunk) setStreamText((prev) => prev + event.chunk);
            if (event.done) {
              setGeneratedScenarios(event.scenarios ?? []);
              setAiProvider(event.ai_provider ?? "");
              setAiModel(event.ai_model ?? "");
              setGenTimeMs(event.generation_time_ms ?? null);
              if (event.scenarios?.length > 0) {
                setGherkin(event.scenarios[0].gherkin);
                setSelectedIdx(0);
              }
              setStep(3);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message.startsWith("data:")) continue;
            throw parseErr;
          }
        }
      }
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectScenario = (idx: number) => {
    setSelectedIdx(idx);
    setGherkin(generatedScenarios[idx]?.gherkin ?? "");
    setTitle(generatedScenarios[idx]?.title ?? title);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createScenario.mutateAsync({
        project_id: projectId,
        title,
        requirement: requirementText,
        source_type: sourceType,
        source_ref: url || null,
        gherkin,
        tags,
        status,
        ai_provider: aiProvider as "claude" | "ollama",
        ai_model: aiModel,
        generation_time_ms: genTimeMs,
      });
      router.push(`/bdd/${projectId}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-muted hover:text-text transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-text">Nuovo scenario BDD</h1>
      </div>

      {/* Stepper */}
      <div className="flex gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full grid place-items-center text-[10px] font-semibold"
                style={{
                  background: i === step ? "var(--accent)" : i < step ? "var(--success)" : "var(--subtle)",
                  color: i <= step ? "white" : "var(--text-muted)",
                }}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className="text-[12px]" style={{ color: i === step ? "var(--accent)" : "var(--text-muted)" }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px mx-2" style={{ background: i < step ? "var(--success)" : "var(--border)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Source */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setSourceType(opt.type)}
                className="rounded-[var(--radius)] border p-3 text-left transition-colors"
                style={{
                  borderColor: sourceType === opt.type ? "var(--accent)" : "var(--border)",
                  background: sourceType === opt.type ? "var(--accent-soft)" : "var(--surface)",
                }}
              >
                <p className="font-semibold text-[13px] text-text">{opt.label}</p>
                <p className="text-[11px] text-text-dim mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>

          {(sourceType === "url" || sourceType === "confluence") && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none focus:border-[var(--accent)]"
            />
          )}

          {(sourceType === "pdf" || sourceType === "docx") && (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={sourceType === "pdf" ? ".pdf" : ".docx"}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius)] border border-dashed border-border text-text-dim hover:bg-hover transition-colors text-[13px]"
              >
                <Upload size={16} />
                {fileRef ? fileRef.name : `Seleziona file ${sourceType.toUpperCase()}`}
              </button>
            </div>
          )}

          {parseError && <p className="text-danger text-[12px]">{parseError}</p>}

          <div className="flex justify-end">
            <button
              onClick={sourceType === "text" ? () => setStep(1) : handleLoadSource}
              disabled={
                parsing ||
                ((sourceType === "url" || sourceType === "confluence") && !url) ||
                ((sourceType === "pdf" || sourceType === "docx") && !fileRef)
              }
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] rounded-[var(--radius-sm)] font-medium disabled:opacity-50 transition-colors"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {parsing ? (
                <><Loader2 size={14} className="animate-spin" /> Caricamento…</>
              ) : (
                <>Avanti <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 1 — Requirement */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titolo del requisito (es. Login con credenziali valide)"
            className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none focus:border-[var(--accent)]"
          />
          <textarea
            value={requirementText}
            onChange={(e) => setRequirementText(e.target.value)}
            placeholder="Descrivi il requisito da testare..."
            rows={8}
            className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none focus:border-[var(--accent)] resize-none"
          />
          <div className="flex justify-between">
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover transition-colors"
            >
              Indietro
            </button>
            <button
              onClick={handleGenerate}
              disabled={!requirementText.trim() || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] rounded-[var(--radius-sm)] font-medium disabled:opacity-50 transition-colors"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Genera scenari <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Generating */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[13px] text-text-dim">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
            Generazione in corso…
          </div>
          <div
            className="rounded-[var(--radius)] border border-border bg-subtle p-4 font-mono text-[12px] text-text overflow-auto"
            style={{ minHeight: 160, whiteSpace: "pre-wrap" }}
          >
            {streamText || "In attesa della risposta AI…"}
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          {generatedScenarios.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {generatedScenarios.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectScenario(i)}
                  className="px-3 py-1 text-[12px] rounded-[var(--radius-sm)] border transition-colors"
                  style={{
                    borderColor: i === selectedIdx ? "var(--accent)" : "var(--border)",
                    background: i === selectedIdx ? "var(--accent-soft)" : "var(--surface)",
                    color: i === selectedIdx ? "var(--accent)" : "var(--text-dim)",
                  }}
                >
                  {s.title || `Scenario ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none focus:border-[var(--accent)]"
            placeholder="Titolo scenario"
          />

          <GherkinEditor value={gherkin} onChange={setGherkin} height={300} />

          <div className="flex flex-col gap-1">
            <p className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>Tag</p>
            <TagManager tags={tags} onChange={setTags} />
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>Status</p>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BddStatus)}
              className="text-[12px] rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 outline-none text-text"
            >
              <option value="draft">Draft</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
            </select>
            {genTimeMs !== null && (
              <span className="text-[11px] text-text-muted font-mono ml-auto">
                {aiProvider} · {aiModel} · {(genTimeMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover transition-colors"
            >
              Ricomincia
            </button>
            <button
              onClick={handleSave}
              disabled={!gherkin.trim() || saving}
              className="px-4 py-2 text-[13px] rounded-[var(--radius-sm)] font-medium disabled:opacity-50 transition-colors"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {saving ? "Salvataggio…" : "Salva scenario"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
