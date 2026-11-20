"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { BackgroundEditor } from "@/components/test-lifecycle/BackgroundEditor";
import { FeatureHeader } from "@/components/test-lifecycle/FeatureHeader";
import { FeatureMetaPanel } from "@/components/test-lifecycle/FeatureMetaPanel";
import { FilePreview } from "@/components/test-lifecycle/FilePreview";
import { ScenarioCard } from "@/components/test-lifecycle/ScenarioCard";
import { StaleLockBanner } from "@/components/test-lifecycle/StaleLockBanner";
import { useTlFeature, useTlTransition } from "@/hooks/useTestLifecycle";
import { usePermissions } from "@/hooks/usePermissions";
import { useTlRevisionWriter, type TlRevisionWriter } from "@/hooks/useTlRevisionWriter";
import {
  apiErrorMessage,
  apiErrorReasons,
  isStaleLockError,
  StaleDraftError,
  writeErrorMessage,
} from "@/lib/test-lifecycle";
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
    writer.clearStale();
    setReloadKey((k) => k + 1);
  };

  const runTransition = async (action: TlTransitionAction, note?: string): Promise<boolean> => {
    if (!revision) return false;
    setTransitionError(null);
    try {
      // Pending edits are saved first and the transition is queued after every write,
      // so it never races a save (and the backend checks run on the latest content).
      await writer.afterPendingWrites(() =>
        transition.mutateAsync({ featureId: feature.id, revisionId: revision.id, action, note }),
      );
      return true;
    } catch (err) {
      if (err instanceof StaleDraftError || isStaleLockError(err)) {
        setTransitionError("La bozza non è aggiornata: ricarica prima di proseguire.");
      } else if (err instanceof Error && err.message === "flush_failed") {
        setTransitionError("Alcune modifiche non sono state salvate: correggile prima di proseguire.");
      } else {
        setTransitionError(
          apiErrorReasons(err).join(" ") || apiErrorMessage(err) || "Transizione non riuscita.",
        );
      }
      return false;
    }
  };

  // Tabs are declared as data so later tasks (Review, Storico) can append entries.
  // Panels holding unsaved drafts are kept mounted so switching tab never loses text.
  const tabs: { value: string; label: string; content: ReactNode; keepMounted?: boolean }[] = [
    {
      value: "scenari",
      label: "Scenari",
      keepMounted: true,
      content: revision ? (
        <ScenariosTab key={`${revision.id}-${reloadKey}`} revision={revision} editable={editable} writer={writer} />
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
      {writer.stale && <StaleLockBanner onReload={() => void reload()} />}
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
        stale={writer.stale}
        onSaveRevision={writer.updateRevision}
        registerFlush={writer.registerFlush}
      />
      <Tabs defaultValue="scenari">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} keepMounted={t.keepMounted} className="pt-3">
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
}: {
  revision: TlRevision;
  editable: boolean;
  writer: TlRevisionWriter;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  // Synchronous guard: a double Enter must not create two scenarios.
  const addingRef = useRef(false);
  const [addError, setAddError] = useState<string | null>(null);
  const scenarios = [...revision.scenarios].sort((a, b) => a.position - b.position);

  const add = async () => {
    const title = newTitle.trim();
    if (!title || addingRef.current || writer.stale) return;
    addingRef.current = true;
    setAdding(true);
    setAddError(null);
    try {
      await writer.addScenario({ title });
      setNewTitle("");
    } catch (err) {
      if (!(err instanceof StaleDraftError) && !isStaleLockError(err)) setAddError(writeErrorMessage(err));
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <BackgroundEditor
        revision={revision}
        readOnly={!editable}
        stale={writer.stale}
        onSave={writer.updateRevision}
        registerFlush={writer.registerFlush}
      />
      {scenarios.length === 0 && <p className="text-[13px] text-text-muted">Nessuno scenario.</p>}
      {scenarios.map((s) => (
        <ScenarioCard
          key={s.id}
          scenario={s}
          readOnly={!editable}
          stale={writer.stale}
          onSave={(patch) => writer.updateScenario(s.id, patch)}
          onRemove={editable ? () => writer.removeScenario(s.id) : undefined}
          registerFlush={writer.registerFlush}
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
            <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={adding || writer.stale || !newTitle.trim()} onClick={() => void add()}>
              <Plus size={14} /> Aggiungi scenario
            </button>
          </div>
          {addError && <p role="alert" className="text-danger text-[13px]">{addError}</p>}
        </div>
      )}
    </div>
  );
}
