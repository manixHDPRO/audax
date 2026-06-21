'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import { ROLE_LABELS, type UserRole } from '@/types';
import { ROLE_DESCRIPTIONS, SYSTEM_ROLES } from '@/lib/permissions';
import {
  getRolesMatrixApi,
  updateSystemRoleApi,
  createCustomRoleApi,
  updateCustomRoleApi,
  deleteCustomRoleApi,
  type CustomRoleItem,
  type RolesMatrixResponse,
} from '@/lib/api-client';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

const inputClass =
  'mt-1 w-full h-9 px-3 rounded-lg bg-carbon-800 border border-carbon-600 text-sm text-cream focus:outline-none focus:border-military-500 focus:ring-1 focus:ring-military-500/30 transition-all';

const textareaClass =
  'mt-1 w-full min-h-[72px] px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-sm text-cream focus:outline-none focus:border-military-500 focus:ring-1 focus:ring-military-500/30 transition-all resize-y';

const labelClass = 'text-[10px] uppercase tracking-wider text-cream/50';

type EditingRole =
  | { kind: 'system'; code: string; label: string; description: string }
  | { kind: 'custom'; role: CustomRoleItem };

export function RolesTab() {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<RolesMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<EditingRole | null>(null);

  const loadRoles = useCallback(async (options?: { keepMessages?: boolean }) => {
    if (!accessToken) return;

    setLoading(true);
    if (!options?.keepMessages) {
      setError('');
      setSuccess('');
    }

    try {
      const result = await getRolesMatrixApi(accessToken);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : API_UNAVAILABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  async function handleCreateRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;

    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    const code = formData.get('code') as string;
    const label = formData.get('label') as string;
    const description = (formData.get('description') as string) || undefined;

    try {
      const created = await createCustomRoleApi(accessToken, { code, label, description, permissions: [] });
      setData((prev) =>
        prev ? { ...prev, customRoles: [...prev.customRoles, created] } : prev,
      );
      setCreateOpen(false);
      setSuccess(`Rôle « ${label} » créé`);
      await loadRoles({ keepMessages: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  }

  async function handleUpdateRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken || !editingRole) return;

    setError('');
    setSuccess('');

    const form = new FormData(e.currentTarget);
    const label = form.get('label') as string;
    const description = (form.get('description') as string) || '';

    try {
      if (editingRole.kind === 'system') {
        await updateSystemRoleApi(accessToken, editingRole.code, { label, description });
      } else {
        await updateCustomRoleApi(accessToken, editingRole.role.id, { label, description });
      }
      setEditingRole(null);
      setSuccess(`Rôle « ${label} » mis à jour`);
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification');
    }
  }

  async function handleDeleteCustomRole(role: CustomRoleItem) {
    if (!accessToken) return;

    const confirmed = window.confirm(
      `Supprimer le rôle « ${role.label} » (${role.code}) ? Cette action est irréversible.`,
    );
    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await deleteCustomRoleApi(accessToken, role.id);
      setSuccess(`Rôle « ${role.label} » supprimé`);
      if (editingRole?.kind === 'custom' && editingRole.role.id === role.id) {
        setEditingRole(null);
      }
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }

  const systemRoleSet = new Set(data?.systemRoles ?? SYSTEM_ROLES);
  const roles = SYSTEM_ROLES.filter((r) => systemRoleSet.has(r));
  const roleLabels = (data?.roleLabels ?? ROLE_LABELS) as Record<string, string>;
  const roleDescriptions = (data?.roleDescriptions ?? ROLE_DESCRIPTIONS) as Record<string, string>;
  const customRoles = data?.customRoles ?? [];

  if (!accessToken) {
    return (
      <p className="text-center py-8 text-cream/40">
        Session expirée — reconnectez-vous pour gérer les rôles.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Rôles</h2>
          <p className="text-sm text-cream/40 mt-1">
            Gérez les libellés, descriptions et rôles personnalisés du système.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => void loadRoles()} disabled={loading || saving}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={() => setCreateOpen(true)} disabled={saving}>
            <Plus className="w-4 h-4" /> Nouveau rôle
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 px-4 py-3 text-sm text-green-400">{success}</div>
      )}

      {loading ? (
        <p className="text-center py-8 text-cream/40">Chargement…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((role) => (
            <Card key={role} className="!p-4 flex flex-col gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cream/30 bg-carbon-800/60 px-2 py-0.5 rounded">
                  Système
                </span>
                <p className="font-medium text-sm mt-2">{roleLabels[role] ?? role}</p>
                <p className="text-[10px] font-mono text-military-400 mt-0.5">{role}</p>
                <p className="text-xs text-cream/40 mt-2">{roleDescriptions[role as UserRole]}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  setEditingRole({
                    kind: 'system',
                    code: role,
                    label: roleLabels[role] ?? role,
                    description: roleDescriptions[role as UserRole] ?? '',
                  })
                }
                disabled={saving}
              >
                <Pencil className="w-4 h-4" /> Modifier le rôle
              </Button>
            </Card>
          ))}

          {customRoles.map((role) => (
            <Card key={role.id} className="!p-4 flex flex-col gap-3 border-military-700/30">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-military-400 bg-military-900/40 px-2 py-0.5 rounded">
                  Personnalisé
                </span>
                <p className="font-medium text-sm mt-2">{role.label}</p>
                <p className="text-[10px] font-mono text-military-400 mt-0.5">{role.code}</p>
                {role.description && <p className="text-xs text-cream/40 mt-2">{role.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditingRole({ kind: 'custom', role })}
                  disabled={saving}
                >
                  <Pencil className="w-4 h-4" /> Modifier
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDeleteCustomRole(role)}
                  disabled={saving}
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && customRoles.length === 0 && (
        <p className="text-xs text-cream/30">
          Les rôles créés via « Nouveau rôle » apparaissent ici avec le badge Personnalisé.
        </p>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un rôle personnalisé</DialogTitle>
            <DialogDescription>Libellé et description uniquement — le code ne pourra pas être modifié ensuite.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="code" className={labelClass}>Code</label>
                <input id="code" name="code" required placeholder="VALIDATEUR_SENIOR" className={inputClass} />
              </div>
              <div>
                <label htmlFor="label" className={labelClass}>Libellé</label>
                <input id="label" name="label" required placeholder="Validateur senior" className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="description" className={labelClass}>Description</label>
              <textarea id="description" name="description" placeholder="Optionnel" className={textareaClass} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit">Créer le rôle</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              {editingRole && (
                <>
                  Code :{' '}
                  <span className="font-mono text-military-400">
                    {editingRole.kind === 'system' ? editingRole.code : editingRole.role.code}
                  </span>
                  {editingRole.kind === 'system' && (
                    <span className="block mt-1 text-cream/40">Le code d&apos;un rôle système est fixe.</span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {editingRole && (
            <form
              key={editingRole.kind === 'system' ? editingRole.code : editingRole.role.id}
              onSubmit={handleUpdateRole}
              className="space-y-4"
            >
              <div>
                <label htmlFor="edit-label" className={labelClass}>Libellé</label>
                <input
                  id="edit-label"
                  name="label"
                  required
                  defaultValue={editingRole.kind === 'system' ? editingRole.label : editingRole.role.label}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="edit-description" className={labelClass}>Description</label>
                <textarea
                  id="edit-description"
                  name="description"
                  defaultValue={
                    editingRole.kind === 'system'
                      ? editingRole.description
                      : editingRole.role.description ?? ''
                  }
                  placeholder="Optionnel"
                  className={textareaClass}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditingRole(null)}>Annuler</Button>
                <Button type="submit" disabled={saving}>Enregistrer</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
