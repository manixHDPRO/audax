'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { CemgMonitoringView } from '@/components/monitoring/cemg-monitoring-view';
import {
  useAuthStore,
  canAccessAdminCommandCenter,
  canAccessCabinetMonitoring,
  canAccessCemgMonitoring,
  getDefaultAppRoute,
} from '@/stores/auth-store';

export default function CemgMonitoringPage() {
  const { user, permissions } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    if (canAccessCemgMonitoring(user.role, permissions)) return;

    if (canAccessCabinetMonitoring(user.role, permissions)) {
      router.replace('/cabinet-monitoring');
      return;
    }

    if (canAccessAdminCommandCenter(user.role, permissions)) {
      router.replace('/command-center');
      return;
    }

    router.replace(getDefaultAppRoute(user.role, permissions));
  }, [user, permissions, router]);

  if (!canAccessCemgMonitoring(user?.role, permissions)) return null;

  return (
    <AuthGuard>
      <CemgMonitoringView />
    </AuthGuard>
  );
}
