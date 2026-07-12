'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import {
  getSystemSecuritySettingsApi,
  updateSystemSecuritySettingsApi,
  type SystemSecuritySettings,
} from '@/lib/api-client';
import { API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import {
  INACTIVITY_TIMEOUT_OPTIONS,
  notifySystemSecurityUpdated,
} from '@/lib/system-security';
import { Monitor, RefreshCw, Shield } from 'lucide-react';

export function SystemSettingsTab() {
  const { accessToken } = useAuthStore();
  const [settings, setSettings] = useState<SystemSecuritySettings>({
    inactivityLockEnabled: false,
    inactivityTimeoutMinutes: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSettings = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError('');

    try {
      const data = await getSystemSecuritySettingsApi(accessToken);
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : API_UNAVAILABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateSystemSecuritySettingsApi(accessToken, settings);
      setSettings(updated);
      notifySystemSecurityUpdated(updated);
      setSuccess('Paramètres système enregistrés');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Monitor className="w-5 h-5 text-military-400" />
            Système
          </h2>
          <p className="text-sm text-cream/40 mt-1">
            Paramètres globaux de sécurité et de comportement de l&apos;application.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadSettings()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-gold-400" />
            Veille après inactivité
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleSave} className="space-y-5">
          <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-carbon-800/40 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-cream">Activer le verrouillage automatique</p>
              <p className="text-xs text-cream/40 mt-1">
                Après une période sans activité, l&apos;écran se verrouille. L&apos;utilisateur doit
                saisir son mot de passe (et le code 2FA le cas échéant) pour continuer.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.inactivityLockEnabled}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, inactivityLockEnabled: e.target.checked }))
              }
              className="w-4 h-4 mt-1 accent-military-500 shrink-0"
              disabled={loading}
            />
          </label>

          <div className={settings.inactivityLockEnabled ? '' : 'opacity-40 pointer-events-none'}>
            <label htmlFor="inactivity-timeout" className="text-sm text-cream/70">
              Délai d&apos;inactivité
            </label>
            <select
              id="inactivity-timeout"
              value={settings.inactivityTimeoutMinutes}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  inactivityTimeoutMinutes: Number(e.target.value),
                }))
              }
              disabled={loading || !settings.inactivityLockEnabled}
              className="mt-2 w-full h-10 px-3 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"
            >
              {INACTIVITY_TIMEOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" disabled={saving || loading}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
