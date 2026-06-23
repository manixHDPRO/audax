'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { NotificationSoundSettings } from '@/components/settings/notification-sound-settings';
import { useAuthStore } from '@/stores/auth-store';
import { ROLE_LABELS } from '@/types';

export function GeneralSettingsTab() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <TwoFactorSetup />

      <NotificationSoundSettings />

      <Card>
        <CardHeader><CardTitle>Autres alertes</CardTitle></CardHeader>
        <div className="space-y-4">
          {['Notifications in-app', 'Alertes email', 'Alertes SMS', 'Alertes prioritaires'].map((pref) => (
            <label key={pref} className="flex items-center justify-between p-3 rounded-xl bg-carbon-800/40 cursor-pointer">
              <span className="text-sm">{pref}</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-military-500" />
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Session</CardTitle></CardHeader>
        <p className="text-sm text-cream/50">Connecté en tant que {user?.email}</p>
        <p className="text-xs text-cream/30 mt-1">Rôle : {user?.role && ROLE_LABELS[user.role]}</p>
      </Card>
    </div>
  );
}
