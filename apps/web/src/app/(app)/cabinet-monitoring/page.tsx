'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { CabinetMonitoringView } from '@/components/monitoring/cabinet-monitoring-view';
import {
  useAuthStore,
  canAccessCabinetMonitoring,
  getDefaultAppRoute,
} from '@/stores/auth-store';

export default function CabinetMonitoringPage() {
  const { user, permissions } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (canAccessCabinetMonitoring(user.role, permissions)) return;
    router.replace(getDefaultAppRoute(user.role, permissions));
  }, [user, permissions, router]);

  if (!canAccessCabinetMonitoring(user?.role, permissions)) return null;

  return (
    <AuthGuard>
      <CabinetMonitoringView />
    </AuthGuard>
  );
}
