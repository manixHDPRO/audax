import { NotFoundException } from '@nestjs/common';
import { AudienceStatus, Priority, UserRole } from '@prisma/client';
import { UserContext } from './audience-role-access';
import { isDelegatedToDircab } from './audience-delegation';

/** Audiences Priorité 0 : visibles par l'Administrateur, le Protocol et le CEMG. 
 * Le Chef de Cabinet ne voit les P0 que s'il en est l'auteur ou la cible (logique gérée dans audienceListWhereForRole).
 */
export function canViewPriorite0Audiences(role: UserRole | string): boolean {
  return (
    role === UserRole.PROTOCOL ||
    role === UserRole.ADMIN ||
    role === UserRole.CEMG
  );
}

export function priorite0ExcludeWhere(role: UserRole | string) {
  if (canViewPriorite0Audiences(role)) return {};
  return { priority: { not: Priority.PRIORITE_0 } };
}

interface AudienceAccessRecord {
  priority: string;
  status?: AudienceStatus | string;
  createdById: string;
  visitTargetUserId?: string | null;
  visitTarget?: { role?: string; cabinetId?: string | null; bureauId?: string | null } | null;
  statusHistory?: { toStatus: string; comment?: string | null }[];
  validations?: { decision: string; comment?: string | null }[];
}

/** Même logique d'accès que audienceListWhereForRole (détail / validation). */
export function assertCanViewAudience(audience: AudienceAccessRecord, user: UserContext): void {
  const { role, id, cabinetId, bureauId } = user;

  if (audience.priority === 'PRIORITE_0' && !canViewPriorite0Audiences(role)) {
    throw new NotFoundException('Audience introuvable');
  }

  if (role === UserRole.ADMIN) return;

  if (role === UserRole.CEMG && audience.status === AudienceStatus.EN_ATTENTE) {
    throw new NotFoundException('Audience introuvable');
  }

  if (role === UserRole.CEMG && isDelegatedToDircab(audience)) {
    return;
  }

  if (role === UserRole.PROTOCOL) {
    if (audience.visitTarget?.role === UserRole.CEMG) return;
    throw new NotFoundException('Audience introuvable');
  }

  const isCreator = audience.createdById === id;
  const isDirectTarget = audience.visitTargetUserId === id;
  const sameCabinet = Boolean(cabinetId && audience.visitTarget?.cabinetId === cabinetId);
  const sameBureau = Boolean(bureauId && audience.visitTarget?.bureauId === bureauId);
  const targetsCEMG = audience.visitTarget?.role === UserRole.CEMG;

  if (isCreator || isDirectTarget || sameCabinet || sameBureau) return;

  if (
    (role === UserRole.PROTOCOL || role === UserRole.CEMG || role === UserRole.CHEF) &&
    targetsCEMG
  ) {
    if (
      role === UserRole.CHEF &&
      audience.priority === 'PRIORITE_0' &&
      audience.status !== AudienceStatus.TRANSMIS_DIRCAB
    ) {
      throw new NotFoundException('Audience introuvable');
    }
    return;
  }

  throw new NotFoundException('Audience introuvable');
}
