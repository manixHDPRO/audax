'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { SecretariatView } from '@/components/monitoring/secretariat-view';
import {
  useAuthStore,
  canAccessSecretariat,
  getDefaultAppRoute,
} from '@/stores/auth-store';

export default function SecretariatPage() {
  const { user, permissions } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (canAccessSecretariat(user.role, permissions)) return;
    router.replace(getDefaultAppRoute(user.role, permissions));
  }, [user, permissions, router]);

  if (!canAccessSecretariat(user?.role, permissions)) return null;

  return (
    <AuthGuard>
      <SecretariatView />
    </AuthGuard>
  );
}
