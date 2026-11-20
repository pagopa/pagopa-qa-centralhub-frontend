"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { FeatureHeader } from "@/components/test-lifecycle/FeatureHeader";
import { FeatureMetaPanel } from "@/components/test-lifecycle/FeatureMetaPanel";
import { FilePreview } from "@/components/test-lifecycle/FilePreview";
import { ScenarioCard } from "@/components/test-lifecycle/ScenarioCard";
import { useTlFeature, useTlTransition } from "@/hooks/useTestLifecycle";
import { usePermissions } from "@/hooks/usePermissions";
import { useTlRevisionWriter } from "@/hooks/useTlRevisionWriter";
import { apiErrorMessage, apiErrorReasons, writeErrorMessage } from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlRevision, TlTransitionAction } from "@/types/test-lifecycle";

export default function FeatureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: feature, isLoading, isError, refetch } = useTlFeature(id);

  if (isLoading) return <p className="text-[13px] text-text-muted">Caricamento…</p>;
  if (isError || !feature) {
    return (
      <div className="flex flex-col gap-3">
        <BackLink />
        <p role="alert" className="text-danger text-[13px]">Feature non trovata o non disponibile.</p>
      </div>
    );
  }
  return <FeatureDetail feature={feature} refetch={refetch} />;
}

function BackLink() {
  return (
    <Link href="/test-lifecycle" className="inline-flex items-center gap-1 text-[13px] text-text-muted hover:text-accent w-fit">
      <ChevronLeft size={14} /> Test Lifecycle
    </Link>
  );
}

function FeatureDetail({ feature, refetch }: { feature: TlFeatureDetail; refetch: () => Promise<unknown> }) {
  const { status: sessionStatus } = useSession();
  const { can } = usePermissions();
  const transition = useTlTransition();
  const [reloadKey, setReloadKey] = useState(0);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const revision: TlRevision | null = feature.working_revision ?? feature.published_revision;
  const sessionReady = sessionStatus === "authenticated";
  const editable =
    !!feature.working_revision && feature.working_revision.status === "draft" && can("edit:tl_feature") && sessionReady;
  const syncKey = `${revision?.id}:${revision?.status}:${reloadKey}`;
  const writer = useTlRevisionWriter(feature.id, feature.working_revision, syncKey);

  // Reload discards local unsaved text: refetch first, then remount editors and reseed the lock.
  const reload = async () => {
    await refetch();
    setReloadKey((k) => k + 1);
  };

  const runTransition = async (action: TlTransitionAction, note?: string): Promise<boolean> => {
    if (!revision) return false;
    setTransitionError(null);
    try {
      await transition.mutateAsync({ featureId: feature.id, revisionId: revision.id, action, note });
      return true;
    } catch (err) {
      setTransitionError(
        apiErrorReasons(err).join(" ") || apiErrorMessage(err) || "Transizione non riuscita.",
      );
      return false;
    }
  };

  // Tabs are declared as data so later tasks (Review, Storico) can append entries.
  const tabs: { value: string; label: string; content: ReactNode }[] = [
    {
      value: "scenari",
      label: "Scenari",
      content: revision ? (
        <ScenariosTab key={`${revision.id}-${reloadKey}`} revision={revision} editable={editable} writer={writer} onReload={reload} />
      ) : (
        <p className="text-[13px] text-text-muted">Nessuna revisione disponibile.</p>
      ),
    },
    {
      value: "anteprima",
      label: "Anteprima file",
      content: <FilePreview featureId={feature.id} revisionId={revision?.id} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <FeatureHeader
        feature={feature}
        onTransition={runTransition}
        disabled={!sessionReady}
        pending={transition.isPending}
        error={transitionError}
      />
      <FeatureMetaPanel
        key={`${revision?.id}-${reloadKey}`}
        feature={feature}
        revision={revision}
        readOnly={!editable}
        onSaveRevision={writer.updateRevision}
        onReload={() => void reload()}
      />
      <Tabs defaultValue="scenari">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="pt-3">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ScenariosTab({
  revision,
  editable,
  writer,
  onReload,
}: {
  revision: TlRevision;
  editable: boolean;
  writer: ReturnType<typeof useTlRevisionWriter>;
  onReload: () => Promise<void>;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const scenarios = [...revision.scenarios].sort((a, b) => a.position - b.position);

  const add = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    setAddError(null);
    try {
      await writer.addScenario({ title });
      setNewTitle("");
    } catch (err) {
      setAddError(writeErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {revision.background_errors.length > 0 && (
        <ul className="text-[12px]" style={{ color: "var(--danger)" }}>
          {revision.background_errors.map((e, i) => (
            <li key={i}>Contesto, riga {e.line}: {e.message}</li>
          ))}
        </ul>
      )}
      {scenarios.length === 0 && <p className="text-[13px] text-text-muted">Nessuno scenario.</p>}
      {scenarios.map((s) => (
        <ScenarioCard
          key={s.id}
          scenario={s}
          readOnly={!editable}
          onSave={(patch) => writer.updateScenario(s.id, patch)}
          onRemove={editable ? () => writer.removeScenario(s.id) : undefined}
          onReload={() => void onReload()}
        />
      ))}
      {editable && (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <input
              aria-label="Titolo nuovo scenario"
              className={`${INPUT_CLASS} flex-1`}
              placeholder="Titolo del nuovo scenario"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void add()}
            />
            <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={adding || !newTitle.trim()} onClick={() => void add()}>
              <Plus size={14} /> Aggiungi scenario
            </button>
          </div>
          {addError && <p role="alert" className="text-danger text-[13px]">{addError}</p>}
        </div>
      )}
    </div>
  );
}
