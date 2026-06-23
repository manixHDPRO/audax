'use client';

import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import type { Notification } from '@/types';
import {
  DEFAULT_NOTIFICATION_SOUND_PREFERENCES,
  NOTIFICATION_SOUND_LABELS,
  playNotificationSound,
  readNotificationSoundPreferences,
  unlockNotificationAudio,
  writeNotificationSoundPreferences,
  type NotificationSoundPreferences,
} from '@/lib/notification-sounds';

const SOUND_TYPES: Notification['type'][] = ['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'];

export function NotificationSoundSettings() {
  const { user } = useAuthStore();
  const [preferences, setPreferences] = useState<NotificationSoundPreferences>(
    DEFAULT_NOTIFICATION_SOUND_PREFERENCES,
  );

  useEffect(() => {
    if (!user?.id) return;
    setPreferences(readNotificationSoundPreferences(user.id));
  }, [user?.id]);

  const persist = (next: NotificationSoundPreferences) => {
    setPreferences(next);
    if (user?.id) {
      writeNotificationSoundPreferences(user.id, next);
    }
  };

  const handleTest = (type: Notification['type']) => {
    unlockNotificationAudio();
    playNotificationSound(type, preferences);
  };

  if (!user?.id) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-military-400" />
          Sons de notification
        </CardTitle>
      </CardHeader>
      <div className="space-y-4">
        <label className="flex items-center justify-between p-3 rounded-xl bg-carbon-800/40 cursor-pointer">
          <span className="text-sm">Activer les sons</span>
          <input
            type="checkbox"
            checked={preferences.enabled}
            onChange={(e) => persist({ ...preferences, enabled: e.target.checked })}
            className="w-4 h-4 accent-military-500"
          />
        </label>

        <div className="p-3 rounded-xl bg-carbon-800/40 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">Intensité du signal</span>
            <span className="text-xs font-mono text-cream/40 tabular-nums">
              {Math.round(preferences.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            value={Math.max(50, Math.round(preferences.volume * 100))}
            onChange={(e) =>
              persist({ ...preferences, volume: Number(e.target.value) / 100 })
            }
            disabled={!preferences.enabled}
            className="w-full accent-military-500"
            aria-label="Intensité des notifications sonores"
          />
          <p className="text-[11px] text-cream/35">
            Signal d&apos;attention renforcé — triple bip (info), sirène (critique).
          </p>
        </div>

        <div className="space-y-2">
          {SOUND_TYPES.map((type) => (
            <div
              key={type}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-carbon-800/40"
            >
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={preferences.byType[type]}
                  disabled={!preferences.enabled}
                  onChange={(e) =>
                    persist({
                      ...preferences,
                      byType: { ...preferences.byType, [type]: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-military-500"
                />
                <span className="text-sm">{NOTIFICATION_SOUND_LABELS[type]}</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!preferences.enabled || !preferences.byType[type]}
                onClick={() => handleTest(type)}
              >
                Tester
              </Button>
            </div>
          ))}
        </div>

        <p className="text-xs text-cream/35">
          Préférences enregistrées pour votre compte sur cet appareil. Chaque utilisateur peut
          choisir ses propres sons.
        </p>
      </div>
    </Card>
  );
}
