export type AppThemeId = 'tactical' | 'midnight' | 'obsidian' | 'sand' | 'daylight';

export interface AppThemeOption {
  id: AppThemeId;
  label: string;
  description: string;
  preview: [string, string, string];
}

export const APP_THEME_OPTIONS: AppThemeOption[] = [
  {
    id: 'tactical',
    label: 'Tactical',
    description: 'Vert militaire — thème par défaut AUDAX',
    preview: ['#0f1a0f', '#4a7c4a', '#c9a227'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Bleu nuit — contraste froid et professionnel',
    preview: ['#0a1220', '#3b6ea8', '#7eb8ff'],
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    description: 'Graphite neutre — interface sobre et discrète',
    preview: ['#0c0c0e', '#5c5c68', '#d4d4dc'],
  },
  {
    id: 'sand',
    label: 'Sand',
    description: 'Sable clair — lecture confortable en journée',
    preview: ['#f4efe4', '#8a7b5a', '#5c4a32'],
  },
  {
    id: 'daylight',
    label: 'Daylight',
    description: 'Clair moderne — fond lumineux et accents bleus',
    preview: ['#eef2f7', '#2563eb', '#1e3a5f'],
  },
];

export const DEFAULT_APP_THEME: AppThemeId = 'tactical';

function themeStorageKey(userId?: string | null): string {
  return userId ? `audax-app-theme-${userId}` : 'audax-app-theme-guest';
}

export function isAppThemeId(value: string): value is AppThemeId {
  return APP_THEME_OPTIONS.some((theme) => theme.id === value);
}

export function readAppTheme(userId?: string | null): AppThemeId {
  if (typeof window === 'undefined') return DEFAULT_APP_THEME;

  try {
    const raw = window.localStorage.getItem(themeStorageKey(userId));
    if (raw && isAppThemeId(raw)) return raw;

    const legacy = window.localStorage.getItem('audax-app-theme');
    if (legacy && isAppThemeId(legacy)) return legacy;
  } catch {
    // localStorage indisponible
  }

  return DEFAULT_APP_THEME;
}

export function writeAppTheme(userId: string | null | undefined, theme: AppThemeId) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(themeStorageKey(userId), theme);
  } catch {
    // ignore
  }
}

export function applyAppTheme(theme: AppThemeId) {
  if (typeof document === 'undefined') return;

  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme =
    theme === 'sand' || theme === 'daylight' ? 'light' : 'dark';
}

export function getThemeBootstrapScript(): string {
  return `(function(){try{var k=localStorage.getItem('audax-app-theme-guest');var t=k||'tactical';if(['tactical','midnight','obsidian','sand','daylight'].indexOf(t)<0)t='tactical';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=(t==='sand'||t==='daylight')?'light':'dark';}catch(e){}})();`;
}
