'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import { ROLE_LABELS, type UserRole } from '@/types';
import {
  DEFAULT_ROLE_MATRIX,
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
  SYSTEM_ROLES,
} from '@/lib/permissions';
import {
  getRolesMatrixApi,
  updateRolesMatrixApi,
  type RolesMatrixResponse,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Check, LayoutGrid, RefreshCw, Save, Settings2, X } from 'lucide-react';

type PermissionSubTab = 'menu' | 'actions';

const SUB_TABS: { id: PermissionSubTab; label: string; icon: React.ElementType; groupId: string }[] = [
  { id: 'menu', label: 'Menus & navigation', icon: LayoutGrid, groupId: 'menu' },
  { id: 'actions', label: 'Actions & fonctionnalités', icon: Settings2, groupId: 'actions' },
];

function PermissionMatrixTable({
  permissionKeys,
  permissionLabels,
  roleLabels,
  roles,
  matrix,
  saving,
  onToggle,
}: {
  permissionKeys: string[];
  permissionLabels: Record<string, string>;
  roleLabels: Record<string, string>;
  roles: UserRole[];
  matrix: Record<string, UserRole[]>;
  saving: boolean;
  onToggle: (permission: string, role: UserRole) => void;
}) {
  if (!permissionKeys.length) {
    return <p className="text-center py-8 text-cream/40">Aucune permission dans cette catégorie.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="border-b border-carbon-700">
            <th className="p-3 text-left text-cream/40 font-medium sticky left-0 bg-carbon-900/95">Permission</th>
            {roles.map((role) => (
              <th key={role} className="p-3 text-center text-cream/40 font-medium text-xs whitespace-nowrap">
                {roleLabels[role] ?? role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissionKeys.map((perm) => (
            <tr key={perm} className="border-b border-carbon-800/50 hover:bg-carbon-800/20">
              <td className="p-3 sticky left-0 bg-carbon-900/95">
                <p className="text-sm">{permissionLabels[perm] ?? perm}</p>
                <p className="text-[10px] font-mono text-cream/30">{perm}</p>
              </td>
              {roles.map((role) => {
                const active = (matrix[perm] ?? []).includes(role);
                return (
                  <td key={role} className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => onToggle(perm, role)}
                      disabled={saving}
                      className={cn(
                        'w-8 h-8 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-40',
                        active
                          ? 'bg-military-600/40 text-green-400 border border-military-500/50'
                          : 'bg-carbon-800/50 text-cream/20 border border-carbon-700/50 hover:border-carbon-600',
                      )}
                      title={active ? 'Retirer' : 'Accorder'}
                    >
                      {active ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PermissionsMatrixTab() {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<RolesMatrixResponse | null>(null);
  const [matrix, setMatrix] = useState<Record<string, UserRole[]>>(DEFAULT_ROLE_MATRIX);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<PermissionSubTab>('menu');

  const loadMatrix = useCallback(async (options?: { keepMessages?: boolean }) => {
    if (!accessToken) return;

    setLoading(true);
    if (!options?.keepMessages) {
      setError('');
      setSuccess('');
    }

    try {
      const result = await getRolesMatrixApi(accessToken);
      setData(result);
      setMatrix(result.matrix as Record<string, UserRole[]>);
    } catch (err) {
      setError(err instanceof Error ? err.message : API_UNAVAILABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  function togglePermission(permission: string, role: UserRole) {
    setMatrix((prev) => {
      const current = prev[permission] ?? [];
      const next = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return { ...prev, [permission]: next };
    });
    setSuccess('');
  }

  async function handleSaveMatrix() {
    if (!accessToken) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateRolesMatrixApi(accessToken, matrix);
      setData(result);
      setMatrix(result.matrix as Record<string, UserRole[]>);
      setSuccess('Permissions enregistrées');
      await useAuthStore.getState().refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  const systemRoleSet = new Set(data?.systemRoles ?? SYSTEM_ROLES);
  const roles = SYSTEM_ROLES.filter((r) => systemRoleSet.has(r)) as UserRole[];
  const permissionGroups = data?.permissionGroups ?? PERMISSION_GROUPS;
  const permissionLabels = data?.permissionLabels ?? PERMISSION_LABELS;
  const roleLabels = (data?.roleLabels ?? ROLE_LABELS) as Record<string, string>;

  const currentSubTab = SUB_TABS.find((tab) => tab.id === activeSubTab) ?? SUB_TABS[0];
  const currentGroup =
    permissionGroups.find((group) => group.id === currentSubTab.groupId) ??
    permissionGroups.find((group) => group.id === 'menu');

  if (!accessToken) {
    return (
      <p className="text-center py-8 text-cream/40">
        Session expirée — reconnectez-vous pour gérer les permissions.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Permissions</h2>
          <p className="text-sm text-cream/40 mt-1">
            Contrôlez les menus visibles et les actions autorisées pour chaque rôle.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => void loadMatrix()} disabled={loading || saving}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleSaveMatrix} disabled={saving || loading || !data}>
            <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 px-4 py-3 text-sm text-green-400">{success}</div>
      )}

      <div className="flex gap-1 p-1 rounded-xl bg-carbon-900/60 border border-carbon-700/50 overflow-x-auto">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const group = permissionGroups.find((g) => g.id === tab.groupId);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
                activeSubTab === tab.id
                  ? 'bg-military-600/30 text-cream border border-military-500/40'
                  : 'text-cream/50 hover:text-cream hover:bg-carbon-800/50',
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {group ? (
                <span className="text-[10px] font-mono text-cream/30 tabular-nums">({group.keys.length})</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentGroup?.label ?? currentSubTab.label}</CardTitle>
          <p className="text-xs text-cream/40 mt-1">
            {activeSubTab === 'menu'
              ? 'Définissez quels menus chaque rôle peut voir dans la navigation.'
              : 'Définissez quelles actions métier chaque rôle peut effectuer.'}
          </p>
        </CardHeader>
        {loading ? (
          <p className="text-center py-8 text-cream/40">Chargement…</p>
        ) : !data ? (
          <p className="text-center py-8 text-cream/40">Impossible de charger la matrice</p>
        ) : (
          <PermissionMatrixTable
            permissionKeys={currentGroup?.keys ?? []}
            permissionLabels={permissionLabels}
            roleLabels={roleLabels}
            roles={roles}
            matrix={matrix}
            saving={saving}
            onToggle={togglePermission}
          />
        )}
      </Card>
    </div>
  );
}
