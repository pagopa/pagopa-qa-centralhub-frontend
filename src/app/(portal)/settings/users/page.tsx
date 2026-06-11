"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { UsersTab } from "./UsersTab";
import { RolesTab } from "./RolesTab";

type TabKey = "users" | "roles";

const TABS: { key: TabKey; label: string }[] = [
  { key: "users", label: "Utenti" },
  { key: "roles", label: "Ruoli & Permessi" },
];

export default function SettingsUsersPage() {
  const [tab, setTab] = useState<TabKey>("users");
  const { role, isLoading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role !== "superadmin") {
      router.replace("/");
    }
  }, [isLoading, role, router]);

  if (isLoading || role !== "superadmin") {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text">Utenti</h1>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 text-[13px] transition-colors border-b-2 -mb-px"
            style={{
              borderColor: tab === t.key ? "var(--accent)" : "transparent",
              color: tab === t.key ? "var(--accent)" : "var(--text-dim)",
              fontWeight: tab === t.key ? 500 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" ? <UsersTab /> : <RolesTab />}
    </div>
  );
}
