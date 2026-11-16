import type { MouseEvent, ReactNode } from "react";
import { ChartLine, LibraryBig, Rocket } from "lucide-react";
import { Chip } from "@/components/primitives/Chip";
import { GithubMark } from "@/components/release-status/GithubMark";
import { TestMarkers } from "@/components/release-status/TestMarkers";
import { VersionCell } from "@/components/release-status/VersionCell";
import type { ApplicationRow as Application, EnvTarget } from "@/types/release-status";

/** Shared by the product header and the rows: name column plus REPO, DEV, UAT, PROD. */
export const RELEASE_GRID =
  "grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-[minmax(15rem,1.6fr)_repeat(4,minmax(0,1fr))] sm:items-center";

const ENV_TARGETS: readonly EnvTarget[] = ["DEV", "UAT", "PROD"];

export function opexDashboardUrl(repository: string): string {
  return (
    "https://portal.azure.com/#@pagopait.onmicrosoft.com/dashboard/arm/subscriptions/" +
    "b9fc9419-6097-45fe-9f74-ba0641c91912/resourceGroups/dashboards/providers/" +
    `Microsoft.Portal/dashboards/pagopa-p-opex_${repository}`
  );
}

function stop(event: MouseEvent) {
  event.stopPropagation();
}

function LinkIcon({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      onClick={stop}
      className="inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </a>
  );
}

function CellSlot({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
      <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-text-muted sm:hidden">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-2">{children}</div>
    </div>
  );
}

interface ApplicationRowProps {
  application: Application;
  onOpen: (applicationId: string) => void;
}

export function ApplicationRow({ application: app, onOpen }: ApplicationRowProps) {
  const hasTestObject = app.test_object !== null;

  return (
    <div
      onClick={() => onOpen(app.id)}
      className={`${RELEASE_GRID} cursor-pointer border-t border-border px-4 py-3 transition-colors first:border-t-0 hover:bg-hover/60`}
    >
      <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:col-span-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(app.id);
          }}
          className="truncate rounded-sm text-left text-sm font-semibold text-text outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          {app.name}
        </button>
        <span className="flex items-center gap-1">
          <Chip variant="status" value={app.runtime === "AKS" ? "running" : "skipped"} label={app.runtime} />
          <Chip variant="status" value={app.ci === "GHA" ? "running" : "skipped"} label={app.ci} />
        </span>
        <span className="flex items-center">
          <LinkIcon href={`https://github.com/pagopa/${app.repository}`} label={`Repository di ${app.name}`}>
            <LibraryBig className="size-4 text-info" aria-hidden="true" />
          </LinkIcon>
          {app.pipeline_url && (
            <LinkIcon href={app.pipeline_url} label={`Pipeline di ${app.name}`}>
              <Rocket className="size-4 text-accent" aria-hidden="true" />
            </LinkIcon>
          )}
          <LinkIcon href={opexDashboardUrl(app.repository)} label={`Dashboard OpEx di ${app.name}`}>
            <ChartLine className="size-4 text-accent" aria-hidden="true" />
          </LinkIcon>
        </span>
      </div>

      <CellSlot
        label={
          <span className="inline-flex items-center gap-1">
            <GithubMark className="size-2.5" /> Repo
          </span>
        }
      >
        <VersionCell target="REPO" cell={app.repo} />
      </CellSlot>

      {ENV_TARGETS.map((target) => {
        const cell = app.envs[target];
        return (
          <CellSlot key={target} label={target}>
            <VersionCell target={target} cell={cell} />
            {cell && <TestMarkers tests={cell.tests} hasTestObject={hasTestObject} />}
          </CellSlot>
        );
      })}
    </div>
  );
}
