import { UserRole } from '@prisma/client';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur système',
  CHEF: 'Chef de cabinet',
  SECRETAIRE: 'Secrétaire',
  PROTOCOL: 'Protocol',
  CEMG: 'Chef d\'état major général',
  SALLE_ATTENTE: 'Salle d\'attente',
  OBSERVATEUR: 'Observateur',
  ASSISTANT: 'Assistant',
};

export const PERMISSIONS = {
  MENU_DASHBOARD: [
    UserRole.ADMIN,
    UserRole.CHEF,
    UserRole.SECRETAIRE,
    UserRole.PROTOCOL,
    UserRole.CEMG,
    UserRole.OBSERVATEUR,
    UserRole.ASSISTANT,
  ],
  MENU_PROTOCOL: [UserRole.ADMIN, UserRole.PROTOCOL],
  MENU_COMMAND_CENTER: [UserRole.ADMIN],
  MENU_CEMG_PILOTAGE: [UserRole.CEMG],
  MENU_CABINET_PILOTAGE: [UserRole.CHEF],
  MENU_SECRETARIAT: [UserRole.SECRETAIRE, UserRole.ASSISTANT],
  MENU_CONSULTATION: [UserRole.OBSERVATEUR],
  MENU_AUDIENCES: [
    UserRole.ADMIN,
    UserRole.CHEF,
    UserRole.SECRETAIRE,
    UserRole.PROTOCOL,
    UserRole.CEMG,
    UserRole.OBSERVATEUR,
    UserRole.ASSISTANT,
    UserRole.SALLE_ATTENTE,
  ],
  MENU_NEW_AUDIENCE: [UserRole.ADMIN, UserRole.SALLE_ATTENTE],
  MENU_CALENDAR: [
    UserRole.ADMIN,
    UserRole.CHEF,
    UserRole.SECRETAIRE,
    UserRole.PROTOCOL,
    UserRole.CEMG,
    UserRole.ASSISTANT,
  ],
  MENU_VISITORS: [UserRole.ADMIN, UserRole.CHEF, UserRole.SECRETAIRE, UserRole.ASSISTANT, UserRole.SALLE_ATTENTE],
  MENU_REPORTS: [
    UserRole.ADMIN,
    UserRole.CHEF,
    UserRole.SECRETAIRE,
    UserRole.PROTOCOL,
    UserRole.CEMG,
    UserRole.OBSERVATEUR,
    UserRole.ASSISTANT,
  ],
  MENU_NOTIFICATIONS: [
    UserRole.ADMIN,
    UserRole.CHEF,
    UserRole.SECRETAIRE,
    UserRole.PROTOCOL,
    UserRole.CEMG,
    UserRole.OBSERVATEUR,
    UserRole.ASSISTANT,
  ],
  MENU_CHAT: [
    UserRole.ADMIN,
    UserRole.CHEF,
    UserRole.SECRETAIRE,
    UserRole.PROTOCOL,
    UserRole.CEMG,
    UserRole.SALLE_ATTENTE,
    UserRole.OBSERVATEUR,
    UserRole.ASSISTANT,
  ],
  MENU_SETTINGS: [
    UserRole.ADMIN,
    UserRole.CHEF,
    UserRole.SECRETAIRE,
    UserRole.PROTOCOL,
    UserRole.CEMG,
    UserRole.OBSERVATEUR,
    UserRole.ASSISTANT,
  ],
  MENU_AUDIT: [UserRole.ADMIN],
  CREATE_AUDIENCE: [UserRole.ADMIN, UserRole.SALLE_ATTENTE],
  VIEW_OWN_AUDIENCES_TODAY: [UserRole.ADMIN, UserRole.SALLE_ATTENTE],
  VIEW_AUDIENCES: [UserRole.ADMIN, UserRole.CHEF, UserRole.SECRETAIRE, UserRole.PROTOCOL, UserRole.CEMG, UserRole.OBSERVATEUR, UserRole.ASSISTANT],
  VALIDATE_AUDIENCE: [UserRole.ADMIN, UserRole.CHEF, UserRole.PROTOCOL, UserRole.CEMG],
  PLANIFY: [UserRole.ADMIN, UserRole.CHEF, UserRole.SECRETAIRE, UserRole.PROTOCOL, UserRole.CEMG, UserRole.ASSISTANT],
  REGISTER_VISITOR: [UserRole.ADMIN, UserRole.SALLE_ATTENTE],
  MANAGE_VISITORS: [UserRole.ADMIN, UserRole.CHEF, UserRole.SECRETAIRE, UserRole.ASSISTANT],
  COMMAND_CENTER: [UserRole.ADMIN, UserRole.CHEF, UserRole.CEMG],
  REPORTS: [UserRole.ADMIN, UserRole.CHEF, UserRole.SECRETAIRE, UserRole.PROTOCOL, UserRole.CEMG, UserRole.OBSERVATEUR, UserRole.ASSISTANT],
  AUDIT: [UserRole.ADMIN],
  MANAGE_USERS: [UserRole.ADMIN],
  DELETE_AUDIENCE: [UserRole.ADMIN],
  COMPLETE_AUDIENCE: [UserRole.ADMIN, UserRole.PROTOCOL, UserRole.SALLE_ATTENTE],
  ACCOMPANY_AUDIENCE: [UserRole.ADMIN, UserRole.SALLE_ATTENTE],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

/** Valeurs par défaut — la matrice effective est chargée via PermissionsService. */
export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
