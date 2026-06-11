"use client";

import { useUsers, useUpdateUser } from "@/hooks/useUsers";
import { useRoleMatrix } from "@/hooks/usePermissions";
import type { UserRecord, RoleOut } from "@/types/index";

export function UsersTab() {
  const { data: usersData, isLoading: usersLoading } = useUsers();
  const { data: roleMatrix, isLoading: rolesLoading } = useRoleMatrix();

  if (usersLoading || rolesLoading) {
    return <p className="text-text-muted text-[13px]">Caricamento…</p>;
  }

  const roles = roleMatrix?.roles ?? [];
  const users = usersData?.items ?? [];

  return (
    <div className="rounded-[var(--radius)] border border-border overflow-hidden">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="bg-subtle border-b border-border">
            <th className="text-left px-3 py-2 font-medium text-text-muted">Email</th>
            <th className="text-left px-3 py-2 font-medium text-text-muted">Nome</th>
            <th className="text-left px-3 py-2 font-medium text-text-muted">Ruolo</th>
            <th className="text-center px-3 py-2 font-medium text-text-muted">Stato</th>
            <th className="text-left px-3 py-2 font-medium text-text-muted">Creato il</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-text-muted text-center">
                Nessun utente
              </td>
            </tr>
          )}
          {users.map((user) => (
            <UserRow key={user.id} user={user} roles={roles} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ user, roles }: { user: UserRecord; roles: RoleOut[] }) {
  const update = useUpdateUser(user.id);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2 font-mono text-[12px] text-text-dim">{user.email}</td>
      <td className="px-3 py-2">{user.name}</td>
      <td className="px-3 py-1">
        <select
          value={user.role}
          onChange={(e) => update.mutate({ role: e.target.value })}
          className="rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1 text-[13px] text-text outline-none"
        >
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-center">
        <button
          onClick={() => update.mutate({ is_active: !user.is_active })}
          className="rounded-[var(--radius-sm)] border border-border text-[12px] px-2 py-1 hover:bg-hover transition-colors"
        >
          {user.is_active ? "Attivo" : "Disattivo"}
        </button>
      </td>
      <td className="px-3 py-2 text-text-dim">
        {new Date(user.created_at).toLocaleDateString("it-IT")}
      </td>
    </tr>
  );
}
