'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type UserListItem, type CreateUserPayload, type UpdateUserPayload, listCabinetsApi, listBureausApi, type OrgUnit } from '@/lib/api-client';
import { ROLE_LABELS, type UserRole } from '@/types';
import { SYSTEM_ROLES } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';

const inputClass =
  'mt-1 w-full h-9 px-3 rounded-lg bg-carbon-800 border border-carbon-600 text-sm text-cream focus:outline-none focus:border-military-500 focus:ring-1 focus:ring-military-500/30 transition-all';

const labelClass = 'text-[10px] uppercase tracking-wider text-cream/50';

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserListItem | null;
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
}

export function UserFormModal({ open, onOpenChange, user, onSubmit }: UserFormModalProps) {
  const { accessToken } = useAuthStore();
  const isEdit = !!user;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<string>(user?.role ?? 'OBSERVATEUR');
  const [cabinets, setCabinets] = useState<OrgUnit[]>([]);
  const [bureaus, setBureaus] = useState<OrgUnit[]>([]);

  useEffect(() => {
    if (open && accessToken) {
      listCabinetsApi(accessToken).then(setCabinets).catch(console.error);
      listBureausApi(accessToken).then(setBureaus).catch(console.error);
    }
  }, [open, accessToken]);

  useEffect(() => {
    if (user) {
      setRole(user.role);
    } else {
      setRole('OBSERVATEUR');
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const selectedRole = form.get('role') as string;
    const cabinetId = form.get('cabinetId') as string;
    const bureauId = form.get('bureauId') as string;

    try {
      const payload: Record<string, string | undefined> = {
        firstName: form.get('firstName') as string,
        lastName: form.get('lastName') as string,
        role: selectedRole,
      };

      if (selectedRole === 'CEMG' || selectedRole === 'SECRETAIRE' || selectedRole === 'PROTOCOL' || selectedRole === 'ASSISTANT') {
        payload.cabinetId = cabinetId || undefined;
        payload.bureauId = undefined;
      } else {
        payload.bureauId = bureauId || undefined;
        payload.cabinetId = undefined;
      }

      if (isEdit) {
        await onSubmit({
          firstName: payload.firstName!,
          lastName: payload.lastName!,
          role: payload.role!,
          cabinetId: payload.cabinetId,
          bureauId: payload.bureauId,
        });
      } else {
        await onSubmit({
          email: form.get('email') as string,
          firstName: payload.firstName!,
          lastName: payload.lastName!,
          role: payload.role!,
          cabinetId: payload.cabinetId,
          bureauId: payload.bureauId,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  const isCabinetRole = ['CEMG', 'SECRETAIRE', 'PROTOCOL', 'ASSISTANT'].includes(role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifiez les informations et l\'affectation de l\'utilisateur.'
              : 'Un lien d\'activation sera envoyé par e-mail pour que l\'utilisateur définisse son mot de passe.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" name="email" type="email" required className={inputClass} placeholder="utilisateur@audax.fardc.cd" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className={labelClass}>Prénom</label>
              <input id="firstName" name="firstName" type="text" required defaultValue={user?.firstName ?? ''} className={inputClass} />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>Nom</label>
              <input id="lastName" name="lastName" type="text" required defaultValue={user?.lastName ?? ''} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="role" className={labelClass}>Rôle</label>
              <select
                id="role"
                name="role"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputClass}
              >
                {SYSTEM_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r}</option>
                ))}
              </select>
            </div>

            {isCabinetRole ? (
              <div>
                <label htmlFor="cabinetId" className={labelClass}>Cabinet</label>
                <select id="cabinetId" name="cabinetId" defaultValue={user?.cabinetId ?? ''} className={inputClass}>
                  <option value="">Aucun</option>
                  {cabinets.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="bureauId" className={labelClass}>Bureau</label>
                <select id="bureauId" name="bureauId" defaultValue={user?.bureauId ?? ''} className={inputClass}>
                  <option value="">Aucun</option>
                  {bureaus.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer et envoyer l\'invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
