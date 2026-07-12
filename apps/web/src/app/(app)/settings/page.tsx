'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { GeneralSettingsTab } from '@/components/settings/general-settings-tab';
import { UsersManagementTab } from '@/components/settings/users-management-tab';
import { RolesTab } from '@/components/settings/roles-tab';
import { PermissionsMatrixTab } from '@/components/settings/permissions-matrix-tab';
import { OrgUnitsTab } from '@/components/settings/org-units-tab';
import { MilitaryGradesTab } from '@/components/settings/military-grades-tab';
import { SystemSettingsTab } from '@/components/settings/system-settings-tab';
import { useAuthStore, canManageUsers } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Settings, UserCog, Shield, KeyRound, Building2, Medal, Monitor } from 'lucide-react';

type SettingsTab = 'general' | 'users' | 'roles' | 'permissions' | 'org' | 'grades' | 'system';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: 'general', label: 'Général', icon: Settings },
  { id: 'users', label: 'Utilisateurs', icon: UserCog, adminOnly: true },
  { id: 'roles', label: 'Rôles', icon: Shield, adminOnly: true },
  { id: 'permissions', label: 'Permissions', icon: KeyRound, adminOnly: true },
  { id: 'org', label: 'Structure', icon: Building2, adminOnly: true },
  { id: 'grades', label: 'Grades militaires', icon: Medal, adminOnly: true },
  { id: 'system', label: 'Système', icon: Monitor, adminOnly: true },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, permissions } = useAuthStore();
  const isAdmin = canManageUsers(user?.role, permissions);

  const rawTab = searchParams.get('tab') as SettingsTab | null;
  const activeTab: SettingsTab =
    rawTab === 'users' ||
    rawTab === 'roles' ||
    rawTab === 'permissions' ||
    rawTab === 'org' ||
    rawTab === 'grades' ||
    rawTab === 'system'
      ? isAdmin
        ? rawTab
        : 'general'
      : 'general';

  function setTab(tab: SettingsTab) {
    const qs = tab === 'general' ? '' : `?tab=${tab}`;
    router.replace(`/settings${qs}`, { scroll: false });
  }

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-cream/40 mt-1">Configuration du compte et administration</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-carbon-900/60 border border-carbon-700/50 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
                activeTab === tab.id
                  ? 'bg-military-600/30 text-cream border border-military-500/40'
                  : 'text-cream/50 hover:text-cream hover:bg-carbon-800/50',
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'general' && <GeneralSettingsTab />}
      {activeTab === 'users' && isAdmin && <UsersManagementTab />}
      {activeTab === 'roles' && isAdmin && <RolesTab />}
      {activeTab === 'permissions' && isAdmin && <PermissionsMatrixTab />}
      {activeTab === 'org' && isAdmin && <OrgUnitsTab />}
      {activeTab === 'grades' && isAdmin && <MilitaryGradesTab />}
      {activeTab === 'system' && isAdmin && <SystemSettingsTab />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="p-8 text-center text-cream/40">Chargement…</div>}>
        <SettingsContent />
      </Suspense>
    </AuthGuard>
  );
}
