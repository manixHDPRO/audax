'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
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
  if (permissions?.includes(permission)) return true;
  if (fallbackRoles && role && fallbackRoles.includes(role)) return true;
  return false;
}

export function canAccessCommandCenter(role?: string, permissions?: string[]) {
  return checkPermission('COMMAND_CENTER', permissions, role, ['ADMIN', 'CHEF', 'CEMG']);
}

export function canManageUsers(role?: string, permissions?: string[]) {
  return checkPermission('MANAGE_USERS', permissions, role, ['ADMIN']);
}

export function canViewAudit(role?: string, permissions?: string[]) {
  return checkPermission('AUDIT', permissions, role, ['ADMIN']);
}

export function canDeleteAudience(role?: string, permissions?: string[]) {
  return checkPermission('DELETE_AUDIENCE', permissions, role, ['ADMIN']);
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

export function getDefaultAppRoute(role?: string) {
  return isWaitingRoomRole(role) ? '/audiences' : '/dashboard';
}

export function hasPermission(permission: string, permissions?: string[]) {
  return permissions?.includes(permission) ?? false;
}

export { API_REQUIRED_MESSAGE, API_UNAVAILABLE_MESSAGE };
