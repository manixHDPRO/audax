import { UserRole } from '@prisma/client';

/** Ordre d'affichage hiérarchique des rôles système. */
export const SYSTEM_ROLE_ORDER: UserRole[] = [
  UserRole.ADMIN,
  UserRole.CEMG,
  UserRole.CHEF,
  UserRole.SECRETAIRE,
  UserRole.PROTOCOL,
  UserRole.SALLE_ATTENTE,
  UserRole.OBSERVATEUR,
];
