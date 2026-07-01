'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserFormModal } from '@/components/users/user-form-modal';
import { SendPasswordLinkModal } from '@/components/users/send-password-link-modal';
import { useAuthStore } from '@/stores/auth-store';
import { API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import { ROLE_LABELS } from '@/types';
import {
  listUsersApi,
  createUserApi,
  updateUserApi,
  toggleUserActiveApi,
  sendUserPasswordLinkApi,
  type UserListItem,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '@/lib/api-client';
import { UserPlus, Pencil, KeyRound, UserX, UserCheck, RefreshCw } from 'lucide-react';

function formatDate(date?: string | null) {
  if (!date) return 'Jamais';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UsersManagementTab() {
  const { user, accessToken } = useAuthStore();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUser, setLinkUser] = useState<UserListItem | null>(null);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError('');

    try {
      const data = await listUsersApi(accessToken);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : API_UNAVAILABLE_MESSAGE);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreate(data: CreateUserPayload | UpdateUserPayload) {
    if (!accessToken) throw new Error('Session expirée');
    const created = await createUserApi(accessToken, data as CreateUserPayload);
    setUsers((prev) => [...prev, created]);
    setSuccess(`Invitation envoyée à ${created.email}`);
  }

  async function handleUpdate(data: CreateUserPayload | UpdateUserPayload) {
    if (!editingUser || !accessToken) return;
    const updated = await updateUserApi(accessToken, editingUser.id, data as UpdateUserPayload);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function handleToggleActive(target: UserListItem) {
    if (target.id === user?.id || !accessToken) return;
    try {
      const updated = await toggleUserActiveApi(accessToken, target.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de statut');
    }
  }

  async function handleSendPasswordLink() {
    if (!linkUser || !accessToken) throw new Error('Session expirée');
    await sendUserPasswordLinkApi(accessToken, linkUser.id);
  }

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Gestion des utilisateurs</h2>
          <p className="text-sm text-cream/40 mt-1">
            {users.length} compte{users.length > 1 ? 's' : ''} · {activeCount} actif{activeCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => { setEditingUser(null); setFormOpen(true); }}>
            <UserPlus className="w-4 h-4" /> Ajouter
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-cream/40">Chargement…</div>
      ) : users.length === 0 && !error ? (
        <div className="text-center py-12 text-cream/40">Aucun utilisateur</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="!p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-military-800 flex items-center justify-center text-sm font-bold text-gold-400 shrink-0">
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {u.firstName} {u.lastName}
                      {u.id === user?.id && (
                        <span className="ml-2 text-[10px] text-military-400">(vous)</span>
                      )}
                    </p>
                    <p className="text-xs text-cream/40 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-cream/30">
                        Dernière connexion : {formatDate(u.lastLoginAt)}
                      </p>
                      {(u.cabinet || u.bureau) && (
                        <>
                          <span className="text-[10px] text-cream/20">•</span>
                          <p className="text-[10px] text-gold-500/60 font-medium uppercase tracking-wider">
                            {u.cabinet
                              ? `Cabinet: ${u.cabinet.name}`
                              : u.bureau
                                ? `Bureau: ${u.bureau.name}`
                                : ''}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  <span className="text-xs px-2 py-1 rounded bg-military-900/50 text-military-400">
                    {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded ${
                      u.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    {u.isActive ? 'Actif' : 'Inactif'}
                  </span>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" title="Modifier" onClick={() => { setEditingUser(u); setFormOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Envoyer un lien mot de passe" onClick={() => { setLinkUser(u); setLinkOpen(true); }}>
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    {u.id !== user?.id && (
                      <Button variant="ghost" size="sm" title={u.isActive ? 'Désactiver' : 'Activer'} onClick={() => handleToggleActive(u)}>
                        {u.isActive ? <UserX className="w-3.5 h-3.5 text-red-400" /> : <UserCheck className="w-3.5 h-3.5 text-green-400" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <UserFormModal open={formOpen} onOpenChange={setFormOpen} user={editingUser} onSubmit={editingUser ? handleUpdate : handleCreate} />
      <SendPasswordLinkModal
        open={linkOpen}
        onOpenChange={setLinkOpen}
        userName={linkUser ? `${linkUser.firstName} ${linkUser.lastName}` : ''}
        userEmail={linkUser?.email ?? ''}
        onSubmit={handleSendPasswordLink}
      />
    </div>
  );
}
