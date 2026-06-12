import { UserRole } from '@prisma/client';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur système',
  CHEF: 'Chef de cabinet',
  SECRETAIRE: 'Secrétaire',
  PROTOCOL: 'Protocol',
  CEMG: 'Chef d\'état major général',
  SALLE_ATTENTE: 'Salle d\'attente',
  OBSERVATEUR: 'Observateur',
};

export const PERMISSIONS = {
  CREATE_AUDIENCE: [UserRole.ADMIN, UserRole.SALLE_ATTENTE],
  VIEW_OWN_AUDIENCES_TODAY: [UserRole.ADMIN, UserRole.SALLE_ATTENTE],
  VIEW_AUDIENCES: [UserRole.ADMIN, UserRole.CHEF, UserRole.SECRETAIRE, UserRole.PROTOCOL, UserRole.CEMG, UserRole.OBSERVATEUR],
  VALIDATE_AUDIENCE: [UserRole.ADMIN, UserRole.CHEF, UserRole.PROTOCOL, UserRole.CEMG],
  PLANIFY: [UserRole.ADMIN, UserRole.CHEF, UserRole.SECRETAIRE, UserRole.PROTOCOL, UserRole.CEMG],
  MANAGE_VISITORS: [UserRole.ADMIN, UserRole.CHEF, UserRole.SECRETAIRE],
  COMMAND_CENTER: [UserRole.ADMIN, UserRole.CHEF, UserRole.CEMG],
  REPORTS: [UserRole.ADMIN, UserRole.CHEF, UserRole.SECRETAIRE, UserRole.PROTOCOL, UserRole.CEMG, UserRole.OBSERVATEUR],
  AUDIT: [UserRole.ADMIN],
  MANAGE_USERS: [UserRole.ADMIN],
  DELETE_AUDIENCE: [UserRole.ADMIN],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

/** Valeurs par défaut — la matrice effective est chargée via PermissionsService. */
export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
