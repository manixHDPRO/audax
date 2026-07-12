'use client';

import { useEffect, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import {
  APP_THEME_OPTIONS,
  applyAppTheme,
  readAppTheme,
  writeAppTheme,
  type AppThemeId,
} from '@/lib/app-theme';
import { cn } from '@/lib/utils';

export function ThemeSettings() {
  const { user } = useAuthStore();
  const [activeTheme, setActiveTheme] = useState<AppThemeId>('tactical');

  useEffect(() => {
    setActiveTheme(readAppTheme(user?.id));
  }, [user?.id]);

  function selectTheme(themeId: AppThemeId) {
    setActiveTheme(themeId);
    applyAppTheme(themeId);
    writeAppTheme(user?.id, themeId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-military-400" />
          Thème de l&apos;interface
        </CardTitle>
      </CardHeader>

      <p className="text-sm text-cream/45 mb-4">
        Choisissez l&apos;apparence de l&apos;application. Votre préférence est enregistrée sur cet
        appareil pour votre compte. Accessible aussi via{' '}
        <span className="text-cream/60">Profil</span> ou{' '}
        <span className="text-cream/60">Paramètres → Général</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {APP_THEME_OPTIONS.map((theme) => {
          const selected = activeTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => selectTheme(theme.id)}
              className={cn(
                'relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer',
                selected
                  ? 'border-military-500/50 bg-military-950/30 ring-1 ring-military-500/30'
                  : 'border-carbon-600/50 bg-carbon-800/30 hover:border-military-600/40 hover:bg-carbon-800/50',
              )}
              aria-pressed={selected}
            >
              <div className="flex gap-1 shrink-0 pt-0.5">
                {theme.preview.map((color) => (
                  <span
                    key={color}
                    className="w-4 h-8 rounded-sm border border-black/10"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cream">{theme.label}</p>
                <p className="text-xs text-cream/40 mt-0.5 leading-snug">{theme.description}</p>
              </div>
              {selected ? (
                <Check className="w-4 h-4 text-military-400 shrink-0 mt-0.5" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
