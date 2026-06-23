'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { DEFAULT_ROLE_MATRIX } from '@/lib/permissions';
import { isApiConfigured, API_REQUIRED_MESSAGE, API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import { loginApi, verify2FAApi, getMeApi, logoutApi, registerAuthHandlers, type LoginResponse } from '@/lib/api-client';
import { useAudiencesStore } from '@/stores/audiences-store';

export type LoginResult = 'ok' | '2fa' | 'fail' | 'api_error';

interface AuthState {
  user: User | null;
  permissions: string[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  pending2FA: { email: string; tempToken?: string } | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2FA: (code: string) => Promise<boolean>;
  cancel2FA: () => void;
  completeAuth: (data: LoginResponse) => void;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      pending2FA: null,

      completeAuth: (data) => {
        if (data.user && data.accessToken) {
          const user = data.user as User;
          set({
            user,
            permissions: user.permissions ?? [],
            accessToken: data.accessToken,
            refreshToken: data.refreshToken ?? null,
            isAuthenticated: true,
            pending2FA: null,
          });
        }
      },

      login: async (email, password) => {
        if (!isApiConfigured()) return 'api_error';

        try {
          const data = await loginApi(email, password);
          if (data.requires2FA && data.tempToken) {
            set({ pending2FA: { email, tempToken: data.tempToken } });
            return '2fa';
          }
          if (data.user && data.accessToken) {
            get().completeAuth(data);
            await get().refreshUser();
            return 'ok';
          }
          return 'fail';
        } catch {
          return 'api_error';
        }
      },

      verify2FA: async (code) => {
        const pending = get().pending2FA;
        if (!pending?.tempToken) return false;

        try {
          const data = await verify2FAApi(pending.tempToken, code);
          if (data.user && data.accessToken) {
            get().completeAuth(data);
            await get().refreshUser();
            return true;
          }
        } catch {
          return false;
        }
        return false;
      },

      cancel2FA: () => set({ pending2FA: null }),

      refreshUser: async () => {
        const { accessToken, user } = get();
        if (!accessToken || !isApiConfigured()) return user;

        try {
          const profile = await getMeApi(accessToken);
          const updated: User = {
            id: profile.id,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            role: profile.role as UserRole,
            cabinetId: profile.cabinetId,
            bureauId: profile.bureauId,
            isActive: profile.isActive,
            twoFactorEnabled: profile.twoFactorEnabled,
            lastLoginAt: profile.lastLoginAt,
            createdAt: profile.createdAt,
            permissions: profile.permissions,
          };
          set({ user: updated, permissions: profile.permissions });
          return updated;
        } catch {
          return user;
        }
      },

      logout: async () => {
        const { refreshToken } = get();

        if (refreshToken && isApiConfigured()) {
          try {
            await logoutApi(refreshToken);
          } catch {
            /* déconnexion locale même si l'API échoue */
          }
        }

        set({
          user: null,
          permissions: [],
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          pending2FA: null,
        });
        useAudiencesStore.getState().clearAllAudiences();
      },
    }),
    {
      name: 'audax-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken === 'demo-token') {
          state.user = null;
          state.permissions = [];
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
          state.pending2FA = null;
        }
      },
    },
  ),
);

registerAuthHandlers({
  getTokens: () => {
    const { accessToken, refreshToken } = useAuthStore.getState();
    return { accessToken, refreshToken };
  },
  setTokens: (accessToken, refreshToken) => {
    useAuthStore.setState({ accessToken, refreshToken });
  },
  onExpired: () => {
    void useAuthStore.getState().logout();
  },
});

function checkPermission(
  permission: string,
  permissions?: string[],
  role?: string,
  fallbackRoles?: string[],
) {
  // Permissions chargées depuis l'API : la matrice en base fait foi (pas de repli sur les défauts).
  if (permissions != null) {
    return permissions.includes(permission);
  }
  if (fallbackRoles && role && fallbackRoles.includes(role as UserRole)) return true;
  return false;
}

/** Accès à une entrée de menu (matrice RBAC ou défauts système). */
export function canAccessMenu(menuPermission: string, role?: string, permissions?: string[]) {
  const fallback = DEFAULT_ROLE_MATRIX[menuPermission] as UserRole[] | undefined;
  return checkPermission(menuPermission, permissions, role, fallback);
}

export function canAccessCommandCenter(role?: string, permissions?: string[]) {
  return checkPermission('COMMAND_CENTER', permissions, role, ['ADMIN', 'CHEF', 'CEMG']);
}

/** Command Center opérationnel — réservé Admin et Chef de Cabinet. */
export function canAccessAdminCommandCenter(role?: string, permissions?: string[]) {
  if (role === 'CEMG') return false;
  return canAccessMenu('MENU_COMMAND_CENTER', role, permissions);
}

/** Vue de pilotage exécutif — réservée au CEMG. */
export function canAccessCemgMonitoring(role?: string, permissions?: string[]) {
  return canAccessMenu('MENU_CEMG_PILOTAGE', role, permissions);
}

/** Vue de pilotage Cabinet — réservée au Chef de Cabinet. */
export function canAccessCabinetMonitoring(role?: string, permissions?: string[]) {
  return canAccessMenu('MENU_CABINET_PILOTAGE', role, permissions);
}

/** Espace secrétariat — planification et suivi opérationnel. */
export function canAccessSecretariat(role?: string, permissions?: string[]) {
  return canAccessMenu('MENU_SECRETARIAT', role, permissions);
}

/** Vue consultation — lecture seule pour Observateur. */
export function canAccessConsultation(role?: string, permissions?: string[]) {
  return canAccessMenu('MENU_CONSULTATION', role, permissions);
}

export function getMonitoringRoute(role?: string, permissions?: string[]) {
  if (canAccessCemgMonitoring(role, permissions)) return '/cemg-monitoring';
  if (canAccessCabinetMonitoring(role, permissions)) return '/cabinet-monitoring';
  if (canAccessAdminCommandCenter(role, permissions)) return '/command-center';
  if (canAccessSecretariat(role, permissions)) return '/secretariat';
  if (canAccessConsultation(role, permissions)) return '/consultation';
  return null;
}

export function canManageUsers(role?: string, permissions?: string[]) {
  return checkPermission('MANAGE_USERS', permissions, role, ['ADMIN']);
}

export function canViewAudit(role?: string, permissions?: string[]) {
  return canAccessMenu('MENU_AUDIT', role, permissions);
}

export function canDeleteAudience(role?: string, permissions?: string[]) {
  return checkPermission('DELETE_AUDIENCE', permissions, role, ['ADMIN']);
}

export function canRegisterVisitor(role?: string, permissions?: string[]) {
  return checkPermission('REGISTER_VISITOR', permissions, role, ['ADMIN', 'SALLE_ATTENTE']);
}

export function canCreateAudience(role?: string, permissions?: string[]) {
  return checkPermission('CREATE_AUDIENCE', permissions, role, ['ADMIN', 'SALLE_ATTENTE']);
}

export function canValidateAudience(role?: string, permissions?: string[]) {
  return checkPermission('VALIDATE_AUDIENCE', permissions, role, ['ADMIN', 'CHEF', 'PROTOCOL', 'CEMG']);
}

export function canPlanifyAudience(role?: string, permissions?: string[]) {
  return checkPermission('PLANIFY', permissions, role, ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG']);
}

export function canAccompanyAudience(role?: string, permissions?: string[]) {
  return checkPermission('ACCOMPANY_AUDIENCE', permissions, role, ['ADMIN', 'SALLE_ATTENTE']);
}

export function canCompleteAudience(role?: string, permissions?: string[]) {
  return checkPermission('COMPLETE_AUDIENCE', permissions, role, ['ADMIN', 'PROTOCOL', 'SALLE_ATTENTE']);
}

export function canViewAudiences(role?: string, permissions?: string[]) {
  return checkPermission('VIEW_AUDIENCES', permissions, role, [
    'ADMIN',
    'CHEF',
    'SECRETAIRE',
    'PROTOCOL',
    'CEMG',
    'OBSERVATEUR',
  ]);
}

export function isWaitingRoomRole(role?: string) {
  return role === 'SALLE_ATTENTE';
}

/** Priorité 0 : filtrage dédié pour Protocol et Administrateur. */
export function canFilterAudiencesByPriority(role?: string) {
  return role === 'PROTOCOL' || role === 'ADMIN';
}

export function receivesLiveAccompanimentUpdates(role?: string) {
  return role === 'SALLE_ATTENTE';
}

/** Protocol, Admin, Dircab et CEMG : rafraîchissement live des audiences. */
export function receivesLiveAudienceUpdates(role?: string) {
  return role === 'PROTOCOL' || role === 'ADMIN' || role === 'CHEF' || role === 'CEMG';
}

export function getDefaultAppRoute(role?: string, permissions?: string[]) {
  if (isWaitingRoomRole(role)) return '/audiences';
  if (canAccessCemgMonitoring(role, permissions)) return '/cemg-monitoring';
  if (canAccessCabinetMonitoring(role, permissions)) return '/cabinet-monitoring';
  if (canAccessAdminCommandCenter(role, permissions)) return '/command-center';
  if (canAccessSecretariat(role, permissions)) return '/secretariat';
  if (canAccessConsultation(role, permissions)) return '/consultation';
  if (canAccessMenu('MENU_PROTOCOL', role, permissions)) return '/protocol';
  if (canAccessMenu('MENU_DASHBOARD', role, permissions)) return '/dashboard';
  if (canAccessMenu('MENU_AUDIENCES', role, permissions)) return '/audiences';
  return '/profile';
}

export function hasPermission(permission: string, permissions?: string[]) {
  return permissions?.includes(permission) ?? false;
}

export { API_REQUIRED_MESSAGE, API_UNAVAILABLE_MESSAGE };
