import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INPUT_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { CheckResult } from "@/components/release-status/catalog/CheckResult";
import { Field, errorParts } from "@/components/release-status/catalog/Field";
import {
  useCheckApplication,
  useEaComponents,
  useApplicationDetail,
  useSaveApplication,
  useTestObjects,
} from "@/hooks/useReleaseStatus";
import type {
  Application,
  ApplicationInput,
  AppKind,
  Ci,
  CheckResult as CheckResultData,
  EnvTarget,
  Product,
  Runtime,
} from "@/types/release-status";

const REPOSITORY_PATTERN = /^[A-Za-z0-9._-]+$/;
const DEBOUNCE_MS = 300;
const MANUAL_TARGETS: EnvTarget[] = ["DEV", "UAT", "PROD"];
const MAX_VERSION_LENGTH = 100;

interface ApplicationFormProps {
  open: boolean;
  application: Application | null;
  products: Product[];
  defaultProductId: string | null;
  onClose: () => void;
  /** `check` settles with the live check outcome, or null when the check request failed. */
  onSaved: (application: Application, check: Promise<CheckResultData | null>) => void;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ApplicationFormBody({
  application,
  products,
  defaultProductId,
  onClose,
  onSaved,
}: Omit<ApplicationFormProps, "open">) {
  const save = useSaveApplication();
  const check = useCheckApplication();
  const testObjects = useTestObjects();

  const [productId, setProductId] = useState(application?.product_id ?? defaultProductId ?? products[0]?.id ?? "");
  const [name, setName] = useState(application?.name ?? "");
  const [productKey, setProductKey] = useState(application?.product_key ?? "");
  const [repository, setRepository] = useState(application?.repository ?? "");
  const [pipelineUrl, setPipelineUrl] = useState(application?.pipeline_url ?? "");
  const [runtime, setRuntime] = useState<Runtime>(application?.runtime ?? "AKS");
  const [ci, setCi] = useState<Ci>(application?.ci ?? "GHA");
  const [kind, setKind] = useState<AppKind>(application?.kind ?? "backend");
  const [testObject, setTestObject] = useState(application?.test_object ?? "");
  const [eaNodeId, setEaNodeId] = useState(application?.ea_node_id ?? "");
  const [eaTouched, setEaTouched] = useState(false);
  const [eaSearch, setEaSearch] = useState("");
  const [hidden, setHidden] = useState(application?.hidden ?? false);
  const [manual, setManual] = useState(application?.version_source === "MANUAL");
  const [edits, setEdits] = useState<Partial<Record<EnvTarget, string>>>({});
  // An existing AUTO application has no stored manual versions: its last read versions are the
  // starting point, fetched only once the toggle is switched on.
  const wasAuto = application !== null && application.version_source !== "MANUAL";
  const detail = useApplicationDetail(wasAuto && manual ? application.id : null);
  const loadingBaseline = wasAuto && manual && detail.isLoading;
  // Without the current versions the inputs would look empty while the backend keeps the old
  // values: block editing and saving until they are loaded.
  const baselineFailed = wasAuto && manual && detail.isError && !detail.data;
  const baselineBlocked = loadingBaseline || baselineFailed;
  const baselineOf = (target: EnvTarget): string =>
    wasAuto ? (detail.data?.application.envs[target]?.version ?? "") : (application?.manual_versions?.[target] ?? "");
  const versionOf = (target: EnvTarget): string => edits[target] ?? baselineOf(target);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResultData | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const eaQuery = useDebounced(eaSearch.trim() || repository.trim(), DEBOUNCE_MS);
  const eaComponents = useEaComponents(eaQuery);
  const components = eaComponents.data ?? [];

  // Suggest the EA component whose id matches the repository, unless the user chose one.
  const suggestedEa = components.find((c) => c.id === repository.trim())?.id ?? "";
  const effectiveEaId = eaTouched ? eaNodeId : eaNodeId || suggestedEa;

  const keyErrors = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!productKey.trim()) next.product_key = "La chiave prodotto è obbligatoria";
    if (!repository.trim()) next.repository = "Il repository è obbligatorio";
    else if (!REPOSITORY_PATTERN.test(repository.trim()))
      next.repository = "Il repository può contenere solo lettere, numeri, punti, trattini e underscore";
    return next;
  };

  const validate = (): Record<string, string> => {
    const next = keyErrors();
    if (!productId) next.product_id = "Il prodotto è obbligatorio";
    if (!name.trim()) next.name = "Il nome è obbligatorio";
    if (pipelineUrl.trim() && !pipelineUrl.trim().startsWith("https://"))
      next.pipeline_url = "L'URL della pipeline deve iniziare con https://";
    return next;
  };

  const runCheck = async (): Promise<void> => {
    setCheckError(null);
    try {
      setResult(await check.mutateAsync({ product_key: productKey.trim(), repository: repository.trim() }));
    } catch {
      setResult(null);
      setCheckError("Impossibile eseguire la verifica");
    }
  };

  const onVerify = async () => {
    const next = keyErrors();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await runCheck();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0 || baselineBlocked) return;

    // The check runs alongside the save: it never blocks or delays it.
    const checkOutcome: Promise<CheckResultData | null> = check
      .mutateAsync({ product_key: productKey.trim(), repository: repository.trim() })
      .catch(() => null);

    const body: Partial<ApplicationInput> & { id?: string } = {
      id: application?.id,
      product_id: productId,
      name: name.trim(),
      product_key: productKey.trim(),
      repository: repository.trim(),
      pipeline_url: pipelineUrl.trim() || null,
      runtime,
      ci,
      kind,
      test_object: testObject.trim() || null,
      ea_node_id: effectiveEaId || null,
      hidden,
    };
    const wasManual = application?.version_source === "MANUAL";
    if (manual) {
      body.version_source = "MANUAL";
      // only the keys that differ from what is stored are sent; an emptied field clears that environment
      const changed: Partial<Record<EnvTarget, string | null>> = {};
      for (const target of MANUAL_TARGETS) {
        const next = versionOf(target).trim();
        if (next !== baselineOf(target)) changed[target] = next || null;
      }
      if (Object.keys(changed).length > 0) body.manual_versions = changed;
    } else if (wasManual) {
      body.version_source = "AUTO";
    }
    try {
      const saved = await save.mutateAsync(body);
      onSaved(saved, checkOutcome);
    } catch (error) {
      const { status, detail, field } = errorParts(error);
      if (field === "manual_versions" && !manual) setFormError(detail);
      else if (field && detail) setErrors({ [field]: detail });
      else if (status === 404) setErrors({ ea_node_id: detail ?? "Componente EA non trovato" });
      else setFormError(detail ?? "Impossibile salvare l'applicazione");
    }
  };

  const busy = save.isPending || check.isPending;
  const eaOptions =
    effectiveEaId && !components.some((c) => c.id === effectiveEaId)
      ? [{ id: effectiveEaId, name: effectiveEaId }, ...components]
      : components;

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-4">
      {/* only the fields scroll: the footer stays outside, at the bottom of the dialog */}
      <div className="flex max-h-[65vh] min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prodotto" error={errors.product_id}>
            <select className={SELECT_CLASS} value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome applicazione" error={errors.name}>
            <input className={INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Chiave prodotto" error={errors.product_key} hint="Usata per leggere /shared/statuspage/v1/info">
            <input className={INPUT_CLASS} value={productKey} onChange={(e) => setProductKey(e.target.value)} />
          </Field>
          <Field label="Repository" error={errors.repository} hint="Nome del repository GitHub (organizzazione pagopa)">
            <input className={INPUT_CLASS} value={repository} onChange={(e) => setRepository(e.target.value)} />
          </Field>
        </div>

        <Field label="URL pipeline" error={errors.pipeline_url}>
          <input
            className={INPUT_CLASS}
            type="url"
            placeholder="https://"
            value={pipelineUrl}
            onChange={(e) => setPipelineUrl(e.target.value)}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Runtime" error={errors.runtime}>
            <select className={SELECT_CLASS} value={runtime} onChange={(e) => setRuntime(e.target.value as Runtime)}>
              <option value="AKS">AKS</option>
              <option value="AZ">AZ</option>
            </select>
          </Field>
          <Field label="CI" error={errors.ci}>
            <select className={SELECT_CLASS} value={ci} onChange={(e) => setCi(e.target.value as Ci)}>
              <option value="GHA">GHA</option>
              <option value="AZDO">AZDO</option>
            </select>
          </Field>
          <Field label="Tipo" error={errors.kind}>
            <select className={SELECT_CLASS} value={kind} onChange={(e) => setKind(e.target.value as AppKind)}>
              <option value="backend">backend</option>
              <option value="frontend">frontend</option>
            </select>
          </Field>
        </div>

        <Field label="Test object" error={errors.test_object} hint="Scegli un valore esistente o scrivine uno nuovo">
          <input
            className={INPUT_CLASS}
            role="combobox"
            aria-expanded={false}
            aria-controls="test-object-options"
            list="test-object-options"
            value={testObject}
            onChange={(e) => setTestObject(e.target.value)}
          />
        </Field>
        <datalist id="test-object-options">
          {(testObjects.data ?? []).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cerca componente EA">
            <input className={INPUT_CLASS} type="search" value={eaSearch} onChange={(e) => setEaSearch(e.target.value)} />
          </Field>
          <Field label="Componente EA" error={errors.ea_node_id}>
            <select
              className={SELECT_CLASS}
              value={effectiveEaId}
              onChange={(e) => {
                setEaNodeId(e.target.value);
                setEaTouched(true);
              }}
            >
              <option value="">Nessuno</option>
              {eaOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="size-4 accent-[var(--accent)]"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
          />
          Nascondi dalla status page
        </label>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={manual}
              onChange={(e) => setManual(e.target.checked)}
            />
            Versioni inserite a mano
          </label>
          {manual && (
            <fieldset aria-label="Versioni manuali" className="flex flex-col gap-2 rounded-md border border-border bg-subtle p-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {MANUAL_TARGETS.map((target) => (
                  <Field key={target} label={`Versione ${target}`}>
                    <input
                      className={`${INPUT_CLASS} font-mono`}
                      maxLength={MAX_VERSION_LENGTH}
                      value={versionOf(target)}
                      disabled={baselineBlocked}
                      onChange={(e) => setEdits((current) => ({ ...current, [target]: e.target.value }))}
                    />
                  </Field>
                ))}
              </div>
              <p className="text-xs text-text-muted">Svuotare un campo cancella la versione di quell&apos;ambiente.</p>
              {baselineFailed && (
                <p role="alert" className="flex flex-wrap items-center gap-2 text-xs text-danger">
                  Impossibile leggere le versioni attuali.
                  <button
                    type="button"
                    onClick={() => void detail.refetch()}
                    className="rounded-sm font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Riprova
                  </button>
                </p>
              )}
              {errors.manual_versions && (
                <p role="alert" className="text-xs text-danger">
                  {errors.manual_versions}
                </p>
              )}
            </fieldset>
          )}
        </div>

        {result && <CheckResult result={result} repoOnly={manual} />}
        {checkError && (
          <p role="alert" className="text-xs text-warning">
            {checkError}
          </p>
        )}
        {formError && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            {formError}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onVerify} disabled={busy}>
          Verifica
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Annulla
        </Button>
        <Button type="submit" disabled={busy || baselineBlocked}>
          Salva applicazione
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ApplicationForm(props: ApplicationFormProps) {
  const { open, application, onClose } = props;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{application ? "Modifica applicazione" : "Nuova applicazione"}</DialogTitle>
        </DialogHeader>
        <ApplicationFormBody key={application?.id ?? "new"} {...props} />
      </DialogContent>
    </Dialog>
  );
}
