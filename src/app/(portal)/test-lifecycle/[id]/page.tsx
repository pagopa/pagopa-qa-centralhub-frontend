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
import { GitPanel } from "@/components/test-lifecycle/GitPanel";
import { JiraLinks } from "@/components/test-lifecycle/JiraLinks";
import { NrtPanel } from "@/components/test-lifecycle/NrtPanel";
import { RebaseDialog } from "@/components/test-lifecycle/RebaseDialog";
import { FeatureMetaPanel } from "@/components/test-lifecycle/FeatureMetaPanel";
import { HistoryPanel } from "@/components/test-lifecycle/HistoryPanel";
import { FilePreview } from "@/components/test-lifecycle/FilePreview";
import { ReviewPanel } from "@/components/test-lifecycle/ReviewPanel";
import { ScenarioCard } from "@/components/test-lifecycle/ScenarioCard";
import { StaleLockBanner } from "@/components/test-lifecycle/StaleLockBanner";
import { useApplyTlRebase, useTlComments, useTlFeature, useTlTransition } from "@/hooks/useTestLifecycle";
import { usePermissions } from "@/hooks/usePermissions";
import { useTlRevisionWriter, type TlRevisionWriter } from "@/hooks/useTlRevisionWriter";
import {
  apiErrorMessage,
  apiErrorReasons,
  isStaleLockError,
  StaleDraftError,
  writeErrorMessage,
} from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlRebaseSide, TlRevision, TlTransitionAction } from "@/types/test-lifecycle";

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
  const [tab, setTab] = useState<string>("scenari");
  const [rebaseOpen, setRebaseOpen] = useState(false);
  const [commentScenarioId, setCommentScenarioId] = useState<string | null>(null);

  const revision: TlRevision | null = feature.working_revision ?? feature.published_revision;
  const sessionReady = sessionStatus === "authenticated";
  const editable =
    !!feature.working_revision && feature.working_revision.status === "draft" && can("edit:tl_feature") && sessionReady;
  // R17: during review only the reviewer can still be reassigned.
  const reviewerEditable =
    !!feature.working_revision &&
    (feature.working_revision.status === "draft" || feature.working_revision.status === "in_review") &&
    can("edit:tl_feature") &&
    sessionReady;
  const syncKey = `${revision?.id}:${revision?.status}:${reloadKey}`;
  const writer = useTlRevisionWriter(feature.id, feature.working_revision, syncKey);
  const { data: comments } = useTlComments(feature.id, revision?.id);
  const openComments = (comments ?? []).reduce<Record<string, number>>((acc, c) => {
    if (!c.resolved && c.scenario_id) acc[c.scenario_id] = (acc[c.scenario_id] ?? 0) + 1;
    return acc;
  }, {});
  const commentOn = (scenarioId: string) => {
    setCommentScenarioId(scenarioId);
    setTab("review");
  };

  // Reload discards local unsaved text: refetch first, then remount editors and reseed the lock.
  const reload = async () => {
    await refetch();
    writer.clearStale();
    setReloadKey((k) => k + 1);
  };

  const applyRebase = useApplyTlRebase();
  // Pending edits are saved first; the rebase then sends the lock the writer holds now.
  const runRebase = async (choices: Record<string, TlRebaseSide>) => {
    const working = feature.working_revision;
    if (!working) return;
    await writer.afterPendingWrites(() =>
      applyRebase.mutateAsync({
        featureId: feature.id,
        revisionId: working.id,
        lockVersion: writer.currentLock(),
        choices,
      }),
    );
    await reload();
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

  // Tabs are declared as data so new panels can be appended.
  // Panels holding unsaved drafts are kept mounted so switching tab never loses text.
  const tabs: { value: string; label: string; content: ReactNode; keepMounted?: boolean }[] = [
    {
      value: "scenari",
      label: "Scenari",
      keepMounted: true,
      content: revision ? (
        <ScenariosTab
          key={`${revision.id}-${reloadKey}`}
          revision={revision}
          editable={editable}
          writer={writer}
          openComments={openComments}
          onComment={commentOn}
        />
      ) : (
        <p className="text-[13px] text-text-muted">Nessuna revisione disponibile.</p>
      ),
    },
    {
      value: "review",
      label: "Review",
      keepMounted: true,
      content: revision ? (
        <ReviewPanel
          featureId={feature.id}
          revision={revision}
          selectedScenarioId={commentScenarioId}
          onSelectScenario={setCommentScenarioId}
          sessionReady={sessionReady}
        />
      ) : (
        <p className="text-[13px] text-text-muted">Nessuna revisione disponibile.</p>
      ),
    },
    { value: "storico", label: "Storico", content: <HistoryPanel featureId={feature.id} /> },
    {
      value: "git",
      label: feature.open_issues ? `Git (${feature.open_issues})` : "Git",
      content: <GitPanel feature={feature} disabled={!sessionReady} />,
    },
    {
      value: "jira",
      label: feature.jira_error ? "Jira (!)" : "Jira",
      content: <JiraLinks feature={feature} disabled={!sessionReady} />,
    },
    { value: "nrt", label: "NRT", content: <NrtPanel featureId={feature.id} /> },
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
        onRebase={() => setRebaseOpen(true)}
        disabled={!sessionReady}
        pending={transition.isPending}
        error={transitionError}
      />
      <FeatureMetaPanel
        key={`${revision?.id}-${reloadKey}`}
        feature={feature}
        revision={revision}
        readOnly={!editable}
        reviewerEditable={reviewerEditable}
        stale={writer.stale}
        onSaveRevision={writer.updateRevision}
        registerFlush={writer.registerFlush}
      />
      <RebaseDialog
        open={rebaseOpen}
        onOpenChange={setRebaseOpen}
        featureId={feature.id}
        revisionId={feature.working_revision?.id}
        onApply={runRebase}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
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
  openComments,
  onComment,
}: {
  revision: TlRevision;
  editable: boolean;
  writer: TlRevisionWriter;
  openComments: Record<string, number>;
  onComment: (scenarioId: string) => void;
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
          openComments={openComments[s.id] ?? 0}
          onComment={() => onComment(s.id)}
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
