import { AudienceStatus, Prisma, UserRole } from '@prisma/client';
import { priorite0ExcludeWhere } from './priorite0-access';

/** Filtre liste audiences selon le destinataire métier du rôle. */
export function audienceListWhereForRole(role: UserRole | string): Prisma.AudienceWhereInput {
  const base = priorite0ExcludeWhere(role);

  if (role === UserRole.CHEF) {
    return {
      ...base,
      status: AudienceStatus.DEJA_ENVOYE,
    };
  }

  return base;
}

export function shouldNotifyOnAudienceCreate(role: UserRole): boolean {
  return role === UserRole.PROTOCOL || role === UserRole.ADMIN;
}

export function shouldNotifyOnDircabForward(role: UserRole): boolean {
  return role === UserRole.CHEF || role === UserRole.ADMIN;
}
