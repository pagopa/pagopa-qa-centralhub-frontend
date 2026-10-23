"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { apiClient } from "@/lib/api";
import { errorMessage } from "@/lib/ea-map/assist";
import type { EaAssistantConfig, EaAssistantSettings } from "@/types/ea";

const path = "/api/v1/ea/assistant/settings";
const queryKey = ["ea-assistant-settings"];

export default function AssistantSettingsPage() {
  const { role, isLoading } = usePermissions();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && role !== "superadmin") router.replace("/");
  }, [role, isLoading, router]);
  if (isLoading || role !== "superadmin") return null;
  return <SettingsContent />;
}

function SettingsContent() {
  const query = useQuery({
    queryKey,
    queryFn: () => apiClient<EaAssistantSettings>(path),
  });
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-text">Assistente EA Map</h1>
        <p className="mt-2 text-sm text-text-muted">
          Configura il motore di Pagoda per tutti gli utenti di questo ambiente.
          Le modifiche si applicano dalla prossima domanda, senza riavviare il servizio.
        </p>
      </header>
      {query.isLoading && <p className="text-sm text-text-muted">Caricamento impostazioni…</p>}
      {query.isError && (
        <div role="alert" className="text-sm text-text">
          <p>{errorMessage(query.error, "Impossibile caricare le impostazioni.")}</p>
          <button type="button" onClick={() => void query.refetch()}
            className="mt-2 rounded-[var(--radius-sm)] border border-border px-3 py-2 hover:bg-hover">
            Riprova
          </button>
        </div>
      )}
      {query.data && <SettingsForm initial={query.data} />}
    </div>
  );
}

function SettingsForm({ initial }: { initial: EaAssistantSettings }) {
  const [form, setForm] = useState<EaAssistantConfig>({
    provider: initial.provider, gemini_model: initial.gemini_model,
    groq_model: initial.groq_model, fallback_enabled: initial.fallback_enabled,
  });
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (config: EaAssistantConfig) => apiClient<EaAssistantSettings>(path, {
      method: "PUT", body: JSON.stringify(config),
    }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
    },
  });
  const secondary = form.provider === "groq" ? "gemini" : "groq";
  const missing = !initial.configured[form.provider] ? form.provider
    : form.fallback_enabled && !initial.configured[secondary] ? secondary : null;
  const inputClass = "w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
  function update(patch: Partial<EaAssistantConfig>) {
    setForm((current) => ({ ...current, ...patch }));
    save.reset();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (missing || save.isPending) return;
    save.mutate({
      ...form, gemini_model: form.gemini_model.trim(), groq_model: form.groq_model.trim(),
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset disabled={save.isPending} className="flex min-w-0 flex-col gap-5">
        <legend className="mb-3 font-semibold text-text">Motore e modelli</legend>
        <label className="flex flex-col gap-2 text-sm text-text" htmlFor="ea-provider">
          Motore principale
          <select id="ea-provider" className={inputClass} value={form.provider}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "gemini" || value === "groq") update({ provider: value });
            }}>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
          </select>
        </label>
        {(["gemini", "groq"] as const).map((provider) => (
          <div key={provider} className="flex flex-col gap-2">
            <label htmlFor={`ea-${provider}-model`} className="text-sm text-text">
              Modello {provider === "groq" ? "Groq" : "Gemini"}
            </label>
            <input id={`ea-${provider}-model`} className={inputClass} required maxLength={100}
              value={form[`${provider}_model`]}
              onChange={(event) => update({ [`${provider}_model`]: event.target.value })} />
            <p className="text-sm text-text-muted">
              {provider === "groq" ? "Groq" : "Gemini"}: chiave {initial.configured[provider]
                ? "configurata sul backend" : "non configurata sul backend"}.
            </p>
          </div>
        ))}
        <p className="text-sm text-text-muted">
          Le chiavi API restano nei secret del backend: non vengono mostrate o salvate qui.
          Usa identificativi di modelli disponibili sul tuo account.
        </p>
      </fieldset>
      <fieldset disabled={save.isPending} className="min-w-0 border-t border-border pt-5">
        <legend className="font-semibold text-text">Continuità del servizio</legend>
        <label className="mt-3 flex items-start gap-3 text-sm text-text">
          <input type="checkbox" checked={form.fallback_enabled}
            onChange={(event) => update({ fallback_enabled: event.target.checked })}
            className="mt-1 accent-[var(--accent)]" />
          Fallback automatico sull’altro motore
        </label>
        <p className="mt-2 text-sm text-text-muted">
          Se attivo, quando il motore principale è temporaneamente indisponibile o ha esaurito
          la quota, l’analisi riparte su {secondary === "groq" ? "Groq" : "Gemini"}.
          Domanda e risultati degli strumenti potranno quindi essere inviati anche all’altro
          fornitore. Nessun passaggio automatico per chiavi errate o risposte non valide.
          La risposta indica il motore usato e l’eventuale fallback.
        </p>
      </fieldset>
      {missing && (
        <p role="alert" className="text-sm text-text">
          Configura {missing.toUpperCase()}_API_KEY nei secret del backend prima di salvare questa scelta.
        </p>
      )}
      {save.isError && <p role="alert" className="text-sm text-text">
        {errorMessage(save.error, "Impossibile salvare le impostazioni. Riprova.")}
      </p>}
      {save.isSuccess && <p role="status" className="text-sm text-text">
        Impostazioni salvate. Saranno usate dalla prossima domanda.
      </p>}
      <button type="submit"
        disabled={Boolean(missing) || save.isPending || !form.gemini_model.trim() || !form.groq_model.trim()}
        className="self-start rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50">
        {save.isPending ? "Salvataggio…" : "Salva impostazioni"}
      </button>
    </form>
  );
}
