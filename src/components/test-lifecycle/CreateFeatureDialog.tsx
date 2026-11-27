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
import { apiErrorMessage, apiErrorReasons, defaultTestType, TEST_TYPES } from "@/lib/test-lifecycle";
import type { TlTestType } from "@/types/test-lifecycle";

/** Remounts the form on every open / default-scope change so state is re-seeded from props. */
export function CreateFeatureDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultScopeId?: string;
}) {
  return (
    <CreateFeatureForm key={`${props.open}-${props.defaultScopeId ?? ""}`} {...props} />
  );
}

function CreateFeatureForm({
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
  // null = not chosen yet: follows the folder of the selected scope
  const [pickedType, setPickedType] = useState<TlTestType | "" | null>(null);

  // Only active users can own a feature (the backend rejects the others).
  const activeUsers = users?.items.filter((u) => u.is_active) ?? [];
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const currentUserId =
    activeUsers.find((u) => u.email.toLowerCase() === sessionEmail)?.id ?? "";

  // Precompiled with the current user until the user picks another one.
  const ownerId = pickedOwner ?? currentUserId;

  const scopeFolder = scopes?.find((s) => s.id === scopeId)?.repo_folder;
  const testType = pickedType ?? defaultTestType(scopeFolder) ?? "";

  const sessionReady = sessionStatus !== "loading" && !!sessionEmail;
  const canSubmit = sessionReady && !!scopeId && !!title.trim() && !createFeature.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createFeature.mutate(
      {
        scope_id: scopeId,
        title: title.trim(),
        design_owner_id: ownerId || null,
        test_type: testType || null,
      },
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
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
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
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-dim">
            Test type
            <select
              className={SELECT_CLASS}
              value={testType}
              onChange={(e) => setPickedType(e.target.value as TlTestType | "")}
            >
              <option value="">Nessuno</option>
              {TEST_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
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
