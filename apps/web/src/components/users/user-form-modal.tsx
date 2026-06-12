'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { UserListItem, CreateUserPayload, UpdateUserPayload } from '@/lib/api-client';
import { ROLE_LABELS, type UserRole } from '@/types';
import { SYSTEM_ROLES } from '@/lib/permissions';

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
  const isEdit = !!user;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      if (isEdit) {
        await onSubmit({
          firstName: form.get('firstName') as string,
          lastName: form.get('lastName') as string,
          role: form.get('role') as string,
        });
      } else {
        await onSubmit({
          email: form.get('email') as string,
          password: form.get('password') as string,
          firstName: form.get('firstName') as string,
          lastName: form.get('lastName') as string,
          role: form.get('role') as string,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifiez les informations et le rôle de l\'utilisateur.'
              : 'Créez un compte avec un mot de passe temporaire à communiquer à l\'utilisateur.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <>
              <div>
                <label htmlFor="email" className={labelClass}>Email</label>
                <input id="email" name="email" type="email" required className={inputClass} placeholder="utilisateur@audax.fardc.cd" />
              </div>
              <div>
                <label htmlFor="password" className={labelClass}>Mot de passe</label>
                <input id="password" name="password" type="password" required minLength={8} className={inputClass} placeholder="Minimum 8 caractères" />
              </div>
            </>
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

          <div>
            <label htmlFor="role" className={labelClass}>Rôle</label>
            <select id="role" name="role" required defaultValue={user?.role ?? 'OBSERVATEUR'} className={inputClass}>
              {SYSTEM_ROLES.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
