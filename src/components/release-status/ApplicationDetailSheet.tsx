"use client";

import Link from "next/link";
import { ChartLine, LibraryBig, Map as MapIcon, Pencil, Rocket, X } from "lucide-react";
import { opexDashboardUrl } from "@/components/release-status/ApplicationRow";
import { Chip } from "@/components/primitives/Chip";
import { RuntimeChips, ACCENT_LINK_CLASS, repoUrl } from "@/components/release-status/shared";
import { DeployTimeline } from "@/components/release-status/DeployTimeline";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApplicationDetail } from "@/hooks/useReleaseStatus";
import { encodeRoute } from "@/lib/ea-map/graph";
import { Gate } from "@/lib/permissions";
import type { ApplicationDetail, Target } from "@/types/release-status";

const TABS: { target: Target; label: string }[] = [
  { target: "DEV", label: "DEV" },
  { target: "UAT", label: "UAT" },
  { target: "PROD", label: "PROD" },
  { target: "REPO", label: "Release GitHub" },
];

const linkClass = `text-sm ${ACCENT_LINK_CLASS}`;

function SheetBody({ detail }: { detail: ApplicationDetail }) {
  const app = detail.application;
  const versions: { label: string; version: string | null | undefined }[] = [
    { label: "Repo", version: app.repo?.version },
    { label: "DEV", version: app.envs.DEV?.version },
    { label: "UAT", version: app.envs.UAT?.version },
    { label: "PROD", version: app.envs.PROD?.version },
  ];

  return (
    <>
      <header className="flex flex-col gap-3 pr-10">
        <div>
          <DialogTitle className="text-lg">{app.name}</DialogTitle>
          <DialogDescription>{detail.product_name}</DialogDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RuntimeChips app={app} />
          {app.hidden && <Chip variant="status" value="blocked" label="nascosta" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href={repoUrl(app.repository)} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <LibraryBig className="size-4" aria-hidden="true" /> Repository
          </a>
          {app.pipeline_url && (
            <a href={app.pipeline_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <Rocket className="size-4" aria-hidden="true" /> Pipeline
            </a>
          )}
          <a href={opexDashboardUrl(app.repository)} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <ChartLine className="size-4" aria-hidden="true" /> Dashboard OpEx
          </a>
          {app.ea_node_id && (
            <Link href={`/ea-map#${encodeRoute({ view: "map", nodeId: app.ea_node_id })}`} className={linkClass}>
              <MapIcon className="size-4" aria-hidden="true" /> {`EA Map: ${app.ea_node_id}`}
            </Link>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {versions.map(({ label, version }) => (
            <div key={label} className="rounded-lg bg-subtle px-2.5 py-1.5">
              <dt className="font-mono text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</dt>
              <dd className="truncate font-mono text-sm text-text">{version ?? "—"}</dd>
            </div>
          ))}
        </dl>
        {app.test_object === null && (
          <p className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-text">
            Collega un test object per vedere le run
            <Gate action="manage:status_page">
              <Link href="/releases/catalog" className={linkClass}>
                <Pencil className="size-3.5" aria-hidden="true" /> Modifica applicazione
              </Link>
            </Gate>
          </p>
        )}
      </header>

      <Tabs defaultValue="UAT">
        <TabsList variant="line" aria-label="Ambiente">
          {TABS.map(({ target, label }) => (
            <TabsTrigger key={target} value={target}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ target }) => (
          <TabsContent key={target} value={target} className="pt-3">
            <DeployTimeline events={detail.history[target] ?? []} showRuns={target !== "REPO"} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

function SheetContent({ applicationId }: { applicationId: string }) {
  const { data, isLoading, isError } = useApplicationDetail(applicationId);

  if (isError) {
    return (
      <>
        <DialogTitle>Dettaglio applicazione</DialogTitle>
        <p role="alert" className="text-sm text-danger">
          Impossibile caricare il dettaglio dell&apos;applicazione.
        </p>
      </>
    );
  }
  if (isLoading || !data) {
    return (
      <>
        <DialogTitle>Dettaglio applicazione</DialogTitle>
        <div role="status" aria-label="Caricamento" className="flex flex-col gap-3">
          <div className="h-6 w-2/3 animate-pulse rounded bg-subtle" />
          <div className="h-16 animate-pulse rounded bg-subtle" />
          <div className="h-40 animate-pulse rounded bg-subtle" />
        </div>
      </>
    );
  }
  return <SheetBody detail={data} />;
}

interface ApplicationDetailSheetProps {
  applicationId: string | null;
  onClose: () => void;
}

/** Right-side sheet with the deploy history per environment of one application. */
export function ApplicationDetailSheet({ applicationId, onClose }: ApplicationDetailSheetProps) {
  if (applicationId === null) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-y-0 right-0 left-auto top-0 h-full w-full max-w-full translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none rounded-l-xl p-5 sm:max-w-xl"
      >
        <SheetContent applicationId={applicationId} />
        <DialogClose
          aria-label="Chiudi"
          render={
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-lg text-text-dim hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          }
        >
          <X className="size-4" aria-hidden="true" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
