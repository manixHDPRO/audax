'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { changePasswordApi } from '@/lib/api-client';
import { CheckCircle2, Shield } from 'lucide-react';

const inputClass =
  'mt-1 w-full h-9 px-3 rounded-lg bg-carbon-800 border border-carbon-600 text-sm text-cream focus:outline-none focus:border-military-500 focus:ring-1 focus:ring-military-500/30 transition-all';

const labelClass = 'text-[10px] uppercase tracking-wider text-cream/50';

export function ChangePasswordForm() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const currentPassword = form.get('currentPassword') as string;
    const newPassword = form.get('newPassword') as string;
    const confirmPassword = form.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError('Le nouveau mot de passe doit être différent de l\'actuel');
      setLoading(false);
      return;
    }

    try {
      if (!accessToken) throw new Error('Session expirée');
      await changePasswordApi(accessToken, currentPassword, newPassword);
      setSuccess(true);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Changer le mot de passe</CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="currentPassword" className={labelClass}>Mot de passe actuel</label>
          <input id="currentPassword" name="currentPassword" type="password" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="newPassword" className={labelClass}>Nouveau mot de passe</label>
          <input id="newPassword" name="newPassword" type="password" required minLength={8} className={inputClass} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className={labelClass}>Confirmer le nouveau mot de passe</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} className={inputClass} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && (
          <p className="text-sm text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Mot de passe modifié avec succès — reconnectez-vous sur vos autres appareils si nécessaire
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? 'Modification…' : 'Modifier le mot de passe'}
        </Button>
      </form>
    </Card>
  );
}

export function TwoFactorStatus({ enabled }: { enabled?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-cream/40 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5" />
        Authentification 2FA
      </span>
      <span className={enabled ? 'text-green-400' : 'text-amber-400'}>
        {enabled ? 'Activée' : 'Non activée'}
        {!enabled && (
          <Link href="/settings" className="ml-2 text-military-400 hover:text-military-300 text-xs underline">
            Configurer
          </Link>
        )}
      </span>
    </div>
  );
}
