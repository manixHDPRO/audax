'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { applyAppTheme, readAppTheme } from '@/lib/app-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    applyAppTheme(readAppTheme(userId));
  }, [userId]);

  return children;
}
