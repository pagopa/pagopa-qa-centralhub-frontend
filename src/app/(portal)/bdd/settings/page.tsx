"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  useBddSettings,
  useOllamaStart,
  useOllamaStatus,
  useOllamaStop,
  useTestBddConnection,
  useUpdateBddSettings,
} from "@/hooks/useBdd";

export default function BddSettingsPage() {
  const { data: settings, isLoading } = useBddSettings();
  const updateSettings = useUpdateBddSettings();
  const testConnection = useTestBddConnection();

  const [form, setForm] = useState({
    ai_provider: "ollama" as "ollama" | "claude",
    claude_api_key: "",
    claude_model: "claude-sonnet-4-6",
    ollama_base_url: "http://localhost:11434",
    ollama_model: "llama3.2",
    confluence_email: "",
    confluence_api_token: "",
    gherkin_language: "it",
    max_scenarios: 5,
  });

  const { data: ollamaStatus } = useOllamaStatus(form.ai_provider === "ollama");
  const ollamaStart = useOllamaStart();
  const ollamaStop = useOllamaStop();

  useEffect(() => {
    if (settings) {
      setForm((f) => ({
        ...f,
        ai_provider: settings.ai_provider,
        claude_model: settings.claude_model,
        ollama_base_url: settings.ollama_base_url,
        ollama_model: settings.ollama_model,
        confluence_email: settings.confluence_email ?? "",
        gherkin_language: settings.gherkin_language,
        max_scenarios: settings.max_scenarios,
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    const payload: Record<string, any> = {
      ai_provider: form.ai_provider,
      claude_model: form.claude_model,
      ollama_base_url: form.ollama_base_url,
      ollama_model: form.ollama_model,
      confluence_email: form.confluence_email || null,
      gherkin_language: form.gherkin_language,
      max_scenarios: form.max_scenarios,
    };
    if (form.claude_api_key) payload.claude_api_key = form.claude_api_key;
    if (form.confluence_api_token) payload.confluence_api_token = form.confluence_api_token;
    await updateSettings.mutateAsync(payload);
  };

  if (isLoading) return <p className="text-text-muted text-[13px]">Caricamento…</p>;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/bdd" className="text-text-muted hover:text-text transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-text">BDD Settings</h1>
      </div>

      {/* Provider selector */}
      <Section title="Provider AI">
        <div className="flex gap-2">
          {(["ollama", "claude"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setForm((f) => ({ ...f, ai_provider: p }))}
              className="px-4 py-1.5 text-[13px] rounded-[var(--radius-sm)] border transition-colors font-medium"
              style={{
                borderColor: form.ai_provider === p ? "var(--accent)" : "var(--border)",
                background: form.ai_provider === p ? "var(--accent-soft)" : "var(--surface)",
                color: form.ai_provider === p ? "var(--accent)" : "var(--text-dim)",
              }}
            >
              {p === "ollama" ? "Ollama (locale)" : "Claude (Anthropic)"}
            </button>
          ))}
        </div>
      </Section>

      {/* Claude config */}
      {form.ai_provider === "claude" && (
        <Section title="Claude">
          <Row label={`API Key${settings?.claude_api_key_set ? " (già impostata)" : ""}`}>
            <input
              type="password"
              value={form.claude_api_key}
              onChange={(e) => setForm((f) => ({ ...f, claude_api_key: e.target.value }))}
              placeholder={settings?.claude_api_key_set ? "••••••••" : "sk-ant-..."}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none focus:border-[var(--accent)] w-full"
            />
          </Row>
          <Row label="Modello">
            <input
              type="text"
              value={form.claude_model}
              onChange={(e) => setForm((f) => ({ ...f, claude_model: e.target.value }))}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none focus:border-[var(--accent)] w-full"
            />
          </Row>
        </Section>
      )}

      {/* Ollama config */}
      {form.ai_provider === "ollama" && (
        <Section title="Ollama">
          <Row label="Base URL">
            <input
              type="text"
              value={form.ollama_base_url}
              onChange={(e) => setForm((f) => ({ ...f, ollama_base_url: e.target.value }))}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none focus:border-[var(--accent)] w-full"
            />
          </Row>
          <Row label="Modello">
            <input
              type="text"
              value={form.ollama_model}
              onChange={(e) => setForm((f) => ({ ...f, ollama_model: e.target.value }))}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none focus:border-[var(--accent)] w-full"
            />
          </Row>
          <Row label="Stato">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[13px]">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: ollamaStatus?.running ? "var(--success)" : "var(--danger)" }}
                />
                <span style={{ color: ollamaStatus?.running ? "var(--success)" : "var(--text-muted)" }}>
                  {ollamaStatus?.running ? "In esecuzione" : "Offline"}
                </span>
              </span>
              {!ollamaStatus?.running && (
                <button
                  onClick={() => ollamaStart.mutate()}
                  disabled={ollamaStart.isPending}
                  className="flex items-center gap-1 px-3 py-1 text-[12px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover disabled:opacity-50 transition-colors"
                >
                  {ollamaStart.isPending && <Loader2 size={11} className="animate-spin" />}
                  Avvia Ollama
                </button>
              )}
              {ollamaStatus?.running && (
                <button
                  onClick={() => ollamaStop.mutate()}
                  disabled={ollamaStop.isPending}
                  className="flex items-center gap-1 px-3 py-1 text-[12px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover disabled:opacity-50 transition-colors"
                >
                  {ollamaStop.isPending && <Loader2 size={11} className="animate-spin" />}
                  Ferma Ollama
                </button>
              )}
            </div>
          </Row>
        </Section>
      )}

      {/* Confluence config */}
      <Section title="Confluence">
        <Row label="Email">
          <input
            type="text"
            value={form.confluence_email}
            onChange={(e) => setForm((f) => ({ ...f, confluence_email: e.target.value }))}
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none focus:border-[var(--accent)] w-full"
          />
        </Row>
        <Row label={`API Token${settings?.confluence_token_set ? " (già impostato)" : ""}`}>
          <input
            type="password"
            value={form.confluence_api_token}
            onChange={(e) => setForm((f) => ({ ...f, confluence_api_token: e.target.value }))}
            placeholder={settings?.confluence_token_set ? "••••••••" : "token..."}
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none focus:border-[var(--accent)] w-full"
          />
        </Row>
      </Section>

      {/* Preferences */}
      <Section title="Preferenze">
        <Row label="Lingua Gherkin">
          <select
            value={form.gherkin_language}
            onChange={(e) => setForm((f) => ({ ...f, gherkin_language: e.target.value }))}
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none w-full"
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </Row>
        <Row label="Max scenari (1-15)">
          <input
            type="number"
            min={1}
            max={15}
            value={form.max_scenarios}
            onChange={(e) => setForm((f) => ({ ...f, max_scenarios: parseInt(e.target.value) || 5 }))}
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none w-full"
          />
        </Row>
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="px-4 py-2 text-[13px] rounded-[var(--radius-sm)] font-medium disabled:opacity-50 transition-colors"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {updateSettings.isPending ? "Salvataggio…" : "Salva"}
        </button>
        <button
          onClick={() => testConnection.mutate()}
          disabled={testConnection.isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover disabled:opacity-50 transition-colors"
        >
          {testConnection.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
          Testa connessione
        </button>
        {testConnection.isSuccess && (
          <span className="flex items-center gap-1 text-[13px]" style={{ color: "var(--success)" }}>
            <CheckCircle size={14} /> OK
          </span>
        )}
        {testConnection.isError && (
          <span className="flex items-center gap-1 text-[13px]" style={{ color: "var(--danger)" }}>
            <XCircle size={14} /> Errore
          </span>
        )}
        {updateSettings.isSuccess && (
          <span className="text-[12px] font-mono" style={{ color: "var(--success)" }}>Salvato ✓</span>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4 flex flex-col gap-3">
      <p className="font-semibold text-[13px] text-text">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] text-text-muted">{label}</p>
      {children}
    </div>
  );
}
