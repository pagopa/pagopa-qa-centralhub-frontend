"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Activity,
  ChevronLeft,
  FileText,
  GitBranch,
  History,
  Link2,
  ListChecks,
  MessageSquare,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { BackgroundEditor } from "@/components/test-lifecycle/BackgroundEditor";
import { FeatureHeader } from "@/components/test-lifecycle/FeatureHeader";
import { LifecycleProgress } from "@/components/test-lifecycle/LifecycleProgress";
import { GitPanel } from "@/components/test-lifecycle/GitPanel";
import { ImportFromGitDialog } from "@/components/test-lifecycle/ImportFromGitDialog";
import { JiraLinks } from "@/components/test-lifecycle/JiraLinks";
import { MigrationInfo } from "@/components/test-lifecycle/MigrationInfo";
import { NrtPanel } from "@/components/test-lifecycle/NrtPanel";
import { RebaseDialog } from "@/components/test-lifecycle/RebaseDialog";
import { FeatureMetaPanel } from "@/components/test-lifecycle/FeatureMetaPanel";
import { HistoryPanel } from "@/components/test-lifecycle/HistoryPanel";
import { FilePreview } from "@/components/test-lifecycle/FilePreview";
import { ReviewPanel } from "@/components/test-lifecycle/ReviewPanel";
import { BranchSyncBar } from "@/components/test-lifecycle/BranchSyncBar";
import { ScenarioCard, type ScenarioCopy } from "@/components/test-lifecycle/ScenarioCard";
import { TagCleanupNotice } from "@/components/test-lifecycle/TagCleanupNotice";
import { ScenarioIndex } from "@/components/test-lifecycle/ScenarioIndex";
import { StaleLockBanner } from "@/components/test-lifecycle/StaleLockBanner";
import { TlDeleteDialog } from "@/components/test-lifecycle/TlDeleteDialog";
import { useApplyTlRebase, useTlComments, useTlFeature, useTlTransition } from "@/hooks/useTestLifecycle";
import { usePermissions } from "@/hooks/usePermissions";
import { useUnsavedGuard } from "@/hooks/useUnsavedGuard";
import { matchShortcut } from "@/lib/shortcuts";
import { ShortcutHint } from "@/components/test-lifecycle/ShortcutHint";
import { useTlRevisionWriter, type TlRevisionWriter } from "@/hooks/useTlRevisionWriter";
import {
  apiErrorMessage,
  apiErrorReasons,
  isStaleLockError,
  StaleDraftError,
  writeErrorMessage,
} from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlRebaseSide, TlRevision, TlScenario, TlTransitionAction } from "@/types/test-lifecycle";

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
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
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
  useUnsavedGuard(writer.hasUnsaved);
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

  const runTransition = async (
    action: TlTransitionAction,
    note?: string,
    branchName?: string,
  ): Promise<boolean> => {
    if (!revision) return false;
    setTransitionError(null);
    try {
      // Pending edits are saved first and the transition is queued after every write,
      // so it never races a save (and the backend checks run on the latest content).
      await writer.afterPendingWrites(() =>
        transition.mutateAsync({ featureId: feature.id, revisionId: revision.id, action, note, branchName }),
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
  const unresolvedComments = (comments ?? []).filter((c) => !c.resolved).length;
  const tabs: {
    value: string;
    label: string;
    icon: LucideIcon;
    /** Chip next to the label; hidden when 0. `aria-label` keeps the meaning for screen readers. */
    count?: { value: number; label: string };
    alert?: boolean;
    content: ReactNode;
    keepMounted?: boolean;
  }[] = [
    {
      value: "scenari",
      label: "Scenari",
      icon: ListChecks,
      count: { value: revision?.scenarios.length ?? 0, label: "scenari" },
      keepMounted: true,
      content: revision ? (
        <ScenariosTab
          key={`${revision.id}-${reloadKey}`}
          featureId={feature.id}
          onImported={() => void reload()}
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
      icon: MessageSquare,
      count: { value: unresolvedComments, label: "commenti aperti" },
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
    { value: "storico", label: "Storico", icon: History, content: <HistoryPanel featureId={feature.id} /> },
    {
      value: "git",
      label: "Git",
      icon: GitBranch,
      count: { value: feature.open_issues, label: "anomalie aperte" },
      content: <GitPanel feature={feature} disabled={!sessionReady} />,
    },
    {
      value: "jira",
      label: "Jira",
      icon: Link2,
      alert: !!feature.jira_error,
      content: <JiraLinks feature={feature} disabled={!sessionReady} />,
    },
    { value: "nrt", label: "NRT", icon: Activity, content: <NrtPanel featureId={feature.id} /> },
    {
      value: "anteprima",
      label: "Anteprima file",
      icon: FileText,
      content: <FilePreview featureId={feature.id} revisionId={revision?.id} />,
    },
  ];

  const onPageKeyDown = (e: React.KeyboardEvent) => {
    if (matchShortcut(e) !== "save") return;
    e.preventDefault();
    void writer.saveAll();
  };

  return (
    <div className="flex flex-col gap-5" onKeyDown={onPageKeyDown}>
      <BackLink />
      {writer.stale && <StaleLockBanner onReload={() => void reload()} />}
      <FeatureHeader
        feature={feature}
        onTransition={runTransition}
        onRebase={() => setRebaseOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        saveState={writer.saveState}
        deletable={!feature.git_path && !feature.published_revision}
        disabled={!sessionReady}
        pending={transition.isPending}
        error={transitionError}
      />
      <LifecycleProgress feature={feature} />
      <MigrationInfo key={`migration-${feature.id}-${reloadKey}`} feature={feature} />
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
        <TabsList variant="line" className="w-full max-w-full justify-start overflow-x-auto border-b border-border p-0 group-data-horizontal/tabs:!h-auto">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="h-auto flex-none px-3 py-2 data-active:text-[color:var(--area-violet)] after:!bg-[color:var(--area-violet)] group-data-horizontal/tabs:after:!-bottom-px"
            >
              <t.icon size={14} aria-hidden />
              {t.label}
              {t.count && t.count.value > 0 && (
                <>
                  <span
                    aria-hidden
                    className="font-mono text-[11px] rounded-full px-1.5"
                    style={{ background: "var(--neutral-soft)", color: "var(--text-dim)" }}
                  >
                    {t.count.value}
                  </span>
                  <span className="sr-only">{`${t.count.value} ${t.count.label}`}</span>
                </>
              )}
              {t.alert && (
                <>
                  <span aria-hidden className="font-mono text-[11px] text-danger">!</span>
                  <span className="sr-only">errore Jira</span>
                </>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} keepMounted={t.keepMounted} className="pt-3">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
      <TlDeleteDialog
        target={deleteOpen ? { kind: "feature", id: feature.id, label: feature.code } : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => router.push("/test-lifecycle")}
      />
    </div>
  );
}

function ScenariosTab({
  featureId,
  onImported,
  revision,
  editable,
  writer,
  openComments,
  onComment,
}: {
  featureId: string;
  onImported: () => void;
  revision: TlRevision;
  editable: boolean;
  writer: TlRevisionWriter;
  openComments: Record<string, number>;
  onComment: (scenarioId: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const newTitleRef = useRef<HTMLInputElement>(null);
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

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [organiseError, setOrganiseError] = useState<string | null>(null);
  const [cardKeys, setCardKeys] = useState<Record<string, number>>({});
  const dragId = useRef<string | null>(null);
  const setAllCollapsed = (value: boolean) =>
    setCollapsed(Object.fromEntries(scenarios.map((s) => [s.id, value])));

  const reportOrganiseError = (err: unknown) => {
    if (!(err instanceof StaleDraftError) && !isStaleLockError(err)) setOrganiseError(writeErrorMessage(err));
  };
  // The copy is created with the add endpoint, then filled through the update endpoint.
  const duplicate = async (copy: ScenarioCopy) => {
    setOrganiseError(null);
    const created = await writer.addScenario({ title: `${copy.title} (copia)`, kind: copy.kind, polarity: copy.polarity });
    await writer.updateScenario(
      created.id,
      {
        extra_tags: copy.extra_tags,
        steps: copy.steps,
        examples: copy.examples,
        detail_link: copy.detail_link.trim() || null,
      },
      { silent: true },
    );
    // The card mounted empty after the add: remount it so its draft is seeded with the copied content.
    setCardKeys((k) => ({ ...k, [created.id]: (k[created.id] ?? 0) + 1 }));
  };
  const reposition = (id: string, position: number) => {
    setOrganiseError(null);
    writer.updateScenario(id, { position }, { silent: true }).catch(reportOrganiseError);
  };
  const move = (index: number, direction: "up" | "down") => {
    const neighbour = scenarios[direction === "up" ? index - 1 : index + 1];
    if (neighbour) reposition(scenarios[index].id, neighbour.position);
  };
  const dropOn = (target: TlScenario) => {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === target.id) return;
    reposition(sourceId, target.position);
  };
  const jumpTo = (id: string) => {
    setCollapsed((c) => ({ ...c, [id]: false }));
    requestAnimationFrame(() =>
      document.getElementById(`scenario-${id}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" }),
    );
  };

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    if (!editable || matchShortcut(e) !== "add") return;
    // Steps textareas keep Ctrl+Enter for themselves.
    if (e.target instanceof HTMLTextAreaElement) return;
    e.preventDefault();
    if (newTitle.trim()) void add();
    else newTitleRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-4" onKeyDown={onTabKeyDown}>
      {editable && <ShortcutHint />}
      {editable && (
        <ImportFromGitDialog
          featureId={featureId}
          revisionId={revision.id}
          scenarioCount={scenarios.length}
          currentLock={writer.currentLock}
          afterPendingWrites={writer.afterPendingWrites}
          onImported={onImported}
          disabled={writer.stale}
        />
      )}
      <BranchSyncBar
        featureId={featureId}
        revision={revision}
        editable={editable}
        writer={writer}
        onChanged={onImported}
      />
      <TagCleanupNotice
        featureId={featureId}
        editable={editable}
        afterPendingWrites={writer.afterPendingWrites}
        onApplied={onImported}
      />
      <BackgroundEditor
        revision={revision}
        readOnly={!editable}
        stale={writer.stale}
        onSave={writer.updateRevision}
        registerFlush={writer.registerFlush}
      />
      {scenarios.length === 0 && <p className="text-[13px] text-text-muted">Nessuno scenario.</p>}
      {scenarios.length > 0 && (
        <div className="flex items-center gap-2">
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setAllCollapsed(true)}>
            Comprimi tutti
          </button>
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setAllCollapsed(false)}>
            Espandi tutti
          </button>
        </div>
      )}
      {organiseError && <p role="alert" className="text-danger text-[13px]">{organiseError}</p>}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-6">
        <div className="flex flex-col gap-4 min-w-0">
          {scenarios.map((s, index) => (
            <div
              key={`${s.id}-${cardKeys[s.id] ?? 0}`}
              // Only scenario drags are handled: text drag and drop inside the editors keeps working.
              onDragOver={editable ? (e) => { if (dragId.current) e.preventDefault(); } : undefined}
              onDrop={editable ? (e) => { if (!dragId.current) return; e.preventDefault(); dropOn(s); } : undefined}
            >
              <ScenarioCard
                scenario={s}
                readOnly={!editable}
                stale={writer.stale}
                onSave={(patch) => writer.updateScenario(s.id, patch)}
                onRemove={editable ? () => writer.removeScenario(s.id) : undefined}
                registerFlush={writer.registerFlush}
                openComments={openComments[s.id] ?? 0}
                onComment={() => onComment(s.id)}
                collapsed={!!collapsed[s.id]}
                onToggleCollapsed={() => setCollapsed((c) => ({ ...c, [s.id]: !c[s.id] }))}
                onDuplicate={editable ? duplicate : undefined}
                onMove={editable ? (direction) => move(index, direction) : undefined}
                canMoveUp={index > 0}
                canMoveDown={index < scenarios.length - 1}
                dragHandleProps={
                  editable
                    ? {
                        draggable: true,
                        onDragStart: (e) => {
                          dragId.current = s.id;
                          e.dataTransfer.setData("text/plain", s.id);
                          e.dataTransfer.effectAllowed = "move";
                        },
                        onDragEnd: () => {
                          dragId.current = null;
                        },
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
        {scenarios.length > 1 && (
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <ScenarioIndex
                items={scenarios.map((s) => ({ id: s.id, number: s.number, title: s.title, errors: s.errors.length }))}
                onSelect={jumpTo}
              />
            </div>
          </aside>
        )}
      </div>
      {editable && (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <input
              ref={newTitleRef}
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
