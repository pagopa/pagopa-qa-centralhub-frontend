import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INPUT_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { CheckResult } from "@/components/release-status/catalog/CheckResult";
import { Field, errorParts } from "@/components/release-status/catalog/Field";
import {
  useCheckApplication,
  useEaComponents,
  useSaveApplication,
  useTestObjects,
} from "@/hooks/useReleaseStatus";
import type {
  Application,
  ApplicationInput,
  AppKind,
  Ci,
  CheckResult as CheckResultData,
  Product,
  Runtime,
} from "@/types/release-status";

const REPOSITORY_PATTERN = /^[A-Za-z0-9._-]+$/;
const DEBOUNCE_MS = 300;

interface ApplicationFormProps {
  open: boolean;
  application: Application | null;
  products: Product[];
  defaultProductId: string | null;
  onClose: () => void;
  onSaved: (application: Application) => void;
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
    if (Object.keys(next).length > 0) return;

    await runCheck(); // warnings never block saving

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
    };
    try {
      const saved = await save.mutateAsync(body);
      onSaved(saved);
    } catch (error) {
      const { status, detail, field } = errorParts(error);
      if (field && detail) setErrors({ [field]: detail });
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
    <form onSubmit={onSubmit} noValidate className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
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

      {result && <CheckResult result={result} />}
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

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onVerify} disabled={busy}>
          Verifica
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Annulla
        </Button>
        <Button type="submit" disabled={busy}>
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
