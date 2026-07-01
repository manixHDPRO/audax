import { UserRole } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

export function isSuperAdminRole(role: UserRole | string): boolean {
  return role === UserRole.SUPER_ADMIN;
}

export function isPlatformAdmin(role: UserRole | string): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

/** Filtre Prisma : masque les super-admins aux administrateurs classiques. */
export function hiddenSuperAdminUserFilter(callerRole: UserRole | string) {
  if (isSuperAdminRole(callerRole)) return {};
  return { role: { not: UserRole.SUPER_ADMIN } };
}

export function assertCallerCanAccessUser(
  callerRole: UserRole | string,
  targetRole: UserRole | string,
): void {
  if (!isSuperAdminRole(callerRole) && isSuperAdminRole(targetRole)) {
    throw new NotFoundException('Utilisateur introuvable');
  }
}

export function assertRoleAssignable(role: UserRole): void {
  if (role === UserRole.SUPER_ADMIN) {
    throw new ForbiddenException('Ce rôle ne peut pas être attribué');
  }
}
