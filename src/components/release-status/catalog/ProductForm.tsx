import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INPUT_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { Field, errorParts } from "@/components/release-status/catalog/Field";
import { useSaveProduct } from "@/hooks/useReleaseStatus";
import type { Area, Product } from "@/types/release-status";

interface ProductFormProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

function ProductFormBody({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const save = useSaveProduct();
  const [name, setName] = useState(product?.name ?? "");
  const [area, setArea] = useState<Area>(product?.area ?? "CORE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Il nome è obbligatorio" });
      return;
    }
    setErrors({});
    setFormError(null);
    try {
      await save.mutateAsync({ id: product?.id, name: name.trim(), area });
      onClose();
    } catch (error) {
      const { detail, field } = errorParts(error);
      if (field && detail) setErrors({ [field]: detail });
      else setFormError(detail ?? "Impossibile salvare il prodotto");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Field label="Nome prodotto" error={errors.name}>
        <input className={INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Area" error={errors.area}>
        <select className={SELECT_CLASS} value={area} onChange={(e) => setArea(e.target.value as Area)}>
          <option value="CORE">Core</option>
          <option value="TOUCHPOINT">TouchPoint</option>
        </select>
      </Field>
      {formError && (
        <p role="alert" className="text-xs text-danger">
          {formError}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Annulla
        </Button>
        <Button type="submit" disabled={save.isPending}>
          Salva prodotto
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProductForm({ open, product, onClose }: ProductFormProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Modifica prodotto" : "Nuovo prodotto"}</DialogTitle>
        </DialogHeader>
        <ProductFormBody key={product?.id ?? "new"} product={product} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
