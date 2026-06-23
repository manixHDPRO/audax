import { UserRole } from '@prisma/client';
import { UserContext } from './audience-role-access';
import { assertCanViewAudience } from './priorite0-access';

interface AudienceConcernRecord {
  priority: string;
  status?: string;
  createdById: string;
  visitTargetUserId?: string | null;
  visitTarget?: { role?: string; cabinetId?: string | null; bureauId?: string | null } | null;
  statusHistory?: { toStatus: string; comment?: string | null }[];
  validations?: { decision: string; comment?: string | null }[];
}

export function parseAudienceIdFromNotificationLink(link?: string | null): string | null {
  if (!link) return null;
  const match = link.match(/^\/audiences\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function isAudienceNotificationLink(link?: string | null): boolean {
  if (!link) return false;
  return link === '/audiences' || link.startsWith('/audiences/');
}

/** Une notification d'audience n'est visible que si l'audience concerne l'utilisateur. */
export function isUserConcernedByAudience(
  audience: AudienceConcernRecord,
  user: UserContext,
): boolean {
  if (user.role === UserRole.ADMIN) {
    return audience.createdById === user.id || audience.visitTargetUserId === user.id;
  }

  if (user.role === UserRole.CEMG && audience.priority === 'PRIORITE_0') {
    return true;
  }

  if (user.role === UserRole.CHEF && audience.priority === 'PRIORITE_0') {
    return false;
  }

  if (user.role === UserRole.SALLE_ATTENTE && audience.status === 'CONFIRMEE') {
    return (
      audience.createdById === user.id ||
      audience.visitTargetUserId === user.id ||
      isSameOrgUnitAsVisitTarget(user, audience.visitTarget) ||
      audience.visitTarget?.role === UserRole.CEMG
    );
  }

  try {
    assertCanViewAudience(audience, user);
    return true;
  } catch {
    return false;
  }
}

export function isSameOrgUnitAsVisitTarget(
  user: Pick<UserContext, 'cabinetId' | 'bureauId'>,
  visitTarget?: { cabinetId?: string | null; bureauId?: string | null } | null,
): boolean {
  if (!visitTarget) return false;
  if (user.cabinetId && visitTarget.cabinetId && user.cabinetId === visitTarget.cabinetId) {
    return true;
  }
  if (user.bureauId && visitTarget.bureauId && user.bureauId === visitTarget.bureauId) {
    return true;
  }
  return false;
}
