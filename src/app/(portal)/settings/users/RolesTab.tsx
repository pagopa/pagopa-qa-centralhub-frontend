"use client";

import { useRoleMatrix, useUpdateRolePermissions } from "@/hooks/usePermissions";

export function RolesTab() {
  const { data, isLoading } = useRoleMatrix();

  if (isLoading || !data) {
    return <p className="text-text-muted text-[13px]">Caricamento…</p>;
  }

  const categories = Array.from(new Set(data.catalog.map((entry) => entry.category)));

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => (
        <div key={category} className="rounded-[var(--radius)] border border-border overflow-hidden">
          <div className="bg-subtle border-b border-border px-3 py-2 font-semibold text-[13px] text-text">
            {category}
          </div>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 font-medium text-text-muted">Permesso</th>
                {data.roles.map((role) => (
                  <th key={role.key} className="text-center px-3 py-2 font-medium text-text-muted">
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.catalog
                .filter((entry) => entry.category === category)
                .map((entry) => (
                  <tr key={entry.key} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{entry.label}</td>
                    {data.roles.map((role) => (
                      <PermissionCell
                        key={role.key}
                        roleKey={role.key}
                        isSystem={role.is_system}
                        actionKey={entry.key}
                        checked={data.matrix[role.key]?.[entry.key] ?? false}
                      />
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function PermissionCell({
  roleKey,
  isSystem,
  actionKey,
  checked,
}: {
  roleKey: string;
  isSystem: boolean;
  actionKey: string;
  checked: boolean;
}) {
  const update = useUpdateRolePermissions(roleKey);

  return (
    <td className="px-3 py-2 text-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={isSystem}
        onChange={(e) => update.mutate({ [actionKey]: e.target.checked })}
      />
    </td>
  );
}
