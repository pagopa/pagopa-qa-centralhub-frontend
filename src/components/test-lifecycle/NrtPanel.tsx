"use client";

import { useTlFeatureNrt } from "@/hooks/useTestLifecycle";
import { formatRate, NRT_STATUS_COLOR, NRT_STATUS_LABEL, safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlNrtEnvResult } from "@/types/test-lifecycle";

function EnvBadge({ result }: { result: TlNrtEnvResult }) {
  const style = NRT_STATUS_COLOR[result.status];
  const text = `${result.env} ${NRT_STATUS_LABEL[result.status]}`;
  const href = safeHttpUrl(result.allure_url);
  const className = "inline-flex items-center font-mono rounded-full whitespace-nowrap";
  const css = { fontSize: 11, padding: "2px 8px", color: style.color, background: style.bg };
  const title = result.run_at ? `Ultima run: ${new Date(result.run_at).toLocaleString("it-IT")}` : undefined;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${className} hover:underline`} style={css} title={title}>
      {text}
    </a>
  ) : (
    <span className={className} style={css} title={title}>{text}</span>
  );
}

/** Esiti NRT per scenario: ultimo per ambiente (link al report Allure), pass rate, flaky. */
export function NrtPanel({ featureId }: { featureId: string }) {
  const { data, isLoading, isError } = useTlFeatureNrt(featureId);

  if (isError) return <p role="alert" className="text-[13px] text-text-muted">Impossibile caricare gli esiti NRT.</p>;
  if (isLoading || !data) return <p className="text-[13px] text-text-muted">Caricamento…</p>;

  const overall = formatRate(data.pass_rate);
  return (
    <div className="flex flex-col gap-3">
      {data.last_run_at ? (
        <p className="text-[13px] text-text-dim">
          Ultima esecuzione: {new Date(data.last_run_at).toLocaleString("it-IT")}
          {overall && <> · Pass rate complessivo: {overall}</>}
        </p>
      ) : (
        <p className="text-[13px] text-text-muted">
          Nessuna esecuzione NRT trovata per i tag di questa feature. Gli esiti compaiono quando una run
          contiene gli scenari con il loro tag.
        </p>
      )}
      <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-sm)] border border-border">
        {data.scenarios.map((sc) => {
          const rate = formatRate(sc.pass_rate);
          return (
            <li key={sc.scenario_id} data-testid={`nrt-${sc.scenario_id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
              <span className="w-32 shrink-0 font-mono text-text-muted">{sc.tag}</span>
              <span className="min-w-0 flex-1 truncate text-text">{sc.title}</span>
              {sc.envs.length === 0 ? (
                <span className="text-text-muted">Mai eseguito</span>
              ) : (
                <span className="flex flex-wrap gap-1.5">
                  {sc.envs.map((e) => <EnvBadge key={e.env} result={e} />)}
                </span>
              )}
              {rate && (
                <span className="font-mono text-[12px] text-text-dim" title={`Ultime ${sc.runs} run`}>{rate}</span>
              )}
              {sc.flaky && (
                <span className="font-mono rounded-full" style={{ fontSize: 11, padding: "2px 8px", color: "var(--warning)", background: "var(--warning-soft)" }}>
                  Flaky
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
