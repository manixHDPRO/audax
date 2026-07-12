'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm, TwoFactorStatus } from '@/components/profile/profile-sections';
import { ThemeSettings } from '@/components/settings/theme-settings';
import { useAuthStore } from '@/stores/auth-store';
import { ROLE_LABELS, type User } from '@/types';

function formatDate(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const fresh = await refreshUser();
      if (!cancelled) {
        setProfile(fresh ?? user);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshUser]);

  const display = profile ?? user;

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Profil utilisateur</h1>

        <Card>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-military-600 to-military-800 flex items-center justify-center text-2xl font-bold text-gold-400 glow-green">
              {display?.firstName?.[0]}{display?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{display?.firstName} {display?.lastName}</h2>
              <p className="text-cream/50">{display?.email}</p>
              <p className="text-sm text-military-400 mt-1">
                {display?.role && ROLE_LABELS[display.role]}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Informations du compte</CardTitle></CardHeader>
          {loading ? (
            <p className="text-sm text-cream/40">Chargement…</p>
          ) : (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-cream/40">Identifiant</dt>
                <dd>{display?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/40">Rôle</dt>
                <dd>{display?.role && ROLE_LABELS[display.role]}</dd>
              </div>
              <TwoFactorStatus enabled={display?.twoFactorEnabled} />
              <div className="flex justify-between">
                <dt className="text-cream/40">Dernière connexion</dt>
                <dd>{formatDate(display?.lastLoginAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/40">Compte créé le</dt>
                <dd>{formatDate(display?.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/40">Statut</dt>
                <dd className={display?.isActive !== false ? 'text-green-400' : 'text-red-400'}>
                  {display?.isActive !== false ? 'Actif' : 'Inactif'}
                </dd>
              </div>
            </dl>
          )}
        </Card>

        <ThemeSettings />

        <ChangePasswordForm />
      </div>
    </AuthGuard>
  );
}
