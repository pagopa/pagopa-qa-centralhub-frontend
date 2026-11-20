"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SELECT_CLASS,
} from "@/components/ui/formStyles";
import { useCreateTlFeature, useTlScopes } from "@/hooks/useTestLifecycle";
import { useUsers } from "@/hooks/useUsers";
import { apiErrorMessage, apiErrorReasons } from "@/lib/test-lifecycle";

export function CreateFeatureDialog({
  open,
  onOpenChange,
  defaultScopeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultScopeId?: string;
}) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { data: scopes } = useTlScopes();
  const { data: users } = useUsers();
  const createFeature = useCreateTlFeature();

  const [scopeId, setScopeId] = useState(defaultScopeId ?? "");
  const [title, setTitle] = useState("");
  const [pickedOwner, setPickedOwner] = useState<string | null>(null);

  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const currentUserId =
    users?.items.find((u) => u.email.toLowerCase() === sessionEmail)?.id ?? "";

  // Precompiled with the current user until the user picks another one.
  const ownerId = pickedOwner ?? currentUserId;

  const sessionReady = sessionStatus !== "loading" && !!sessionEmail;
  const canSubmit = sessionReady && !!scopeId && !!title.trim() && !createFeature.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createFeature.mutate(
      { scope_id: scopeId, title: title.trim(), design_owner_id: ownerId || null },
      {
        onSuccess: (feature) => {
          setTitle("");
          onOpenChange(false);
          router.push(`/test-lifecycle/${feature.id}`);
        },
      },
    );
  };

  const errorText = createFeature.error
    ? apiErrorMessage(createFeature.error) ??
      (apiErrorReasons(createFeature.error).join(" ") || "Creazione non riuscita.")
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova feature</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-text-dim">
            Ambito
            <select className={SELECT_CLASS} value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
              <option value="">Seleziona un ambito…</option>
              {scopes?.map((s) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-dim">
            Titolo
            <input
              className={INPUT_CLASS}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo della feature"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-dim">
            Owner design
            <select
              className={SELECT_CLASS}
              value={ownerId}
              onChange={(e) => setPickedOwner(e.target.value)}
            >
              <option value="">Nessuno</option>
              {users?.items.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          {createFeature.isError && (
            <p role="alert" className="text-danger text-[13px]">
              {errorText}
            </p>
          )}
        </div>

        <DialogFooter>
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => onOpenChange(false)}>
            Annulla
          </button>
          <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={!canSubmit} onClick={handleSubmit}>
            Crea feature
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
