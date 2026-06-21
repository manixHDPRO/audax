'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, getDefaultAppRoute } from '@/stores/auth-store';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, permissions } = useAuthStore();

  useEffect(() => {
    router.replace(isAuthenticated ? getDefaultAppRoute(user?.role, permissions) : '/login');
  }, [isAuthenticated, user?.role, permissions, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-carbon-950">
      <div className="w-8 h-8 border-2 border-military-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
