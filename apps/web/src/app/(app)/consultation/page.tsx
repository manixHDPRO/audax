'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ConsultationView } from '@/components/monitoring/consultation-view';
import {
  useAuthStore,
  canAccessConsultation,
  getDefaultAppRoute,
} from '@/stores/auth-store';

export default function ConsultationPage() {
  const { user, permissions } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (canAccessConsultation(user.role, permissions)) return;
    router.replace(getDefaultAppRoute(user.role, permissions));
  }, [user, permissions, router]);

  if (!canAccessConsultation(user?.role, permissions)) return null;

  return (
    <AuthGuard>
      <ConsultationView />
    </AuthGuard>
  );
}
