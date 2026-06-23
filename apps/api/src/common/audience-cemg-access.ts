import { AudienceStatus, UserRole } from '@prisma/client';
import { isDelegatedToDircab } from './audience-delegation';

/** Audience relevant du circuit CEMG (réception / suivi Protocol). Hors dossiers délégués au DirCab. */
export function isCemgRelatedAudience(audience: {
  status?: string;
  priority: string;
  visitTarget?: { role?: string } | null;
  statusHistory?: { toStatus?: string; comment?: string | null }[];
  validations?: { decision?: string; comment?: string | null }[];
}): boolean {
  if (isDelegatedToDircab(audience)) return false;
  return audience.visitTarget?.role === UserRole.CEMG;
}

const CHEF_ACCOMPANIMENT_COMMENT = 'Audience validée par le Chef de Cabinet';

/** Validation directe Chef → accompagnement (hors suivi Protocol CEMG). */
export function wasValidatedByChefForAccompaniment(audience: {
  statusHistory?: { comment?: string | null }[];
}): boolean {
  return (
    audience.statusHistory?.some((entry) =>
      entry.comment?.startsWith(CHEF_ACCOMPANIMENT_COMMENT),
    ) ?? false
  );
}

/** Suivi Protocol après validation CEMG (VALIDEE / PLANIFIEE). */
export function isProtocolCemgConfirmQueue(audience: {
  status: string;
  priority: string;
  visitTarget?: { role?: string } | null;
  statusHistory?: { toStatus?: string; comment?: string | null }[];
  validations?: { decision?: string; comment?: string | null }[];
}): boolean {
  if (audience.status !== AudienceStatus.VALIDEE && audience.status !== AudienceStatus.PLANIFIEE) {
    return false;
  }
  if (!isCemgRelatedAudience(audience)) return false;
  return !wasValidatedByChefForAccompaniment(audience);
}

/** Réception Protocol — audiences CEMG confirmées (hors circuit Chef de Cabinet). */
export function isProtocolCemgReceptionQueue(audience: {
  status: string;
  priority: string;
  visitTarget?: { role?: string } | null;
  statusHistory?: { toStatus?: string; comment?: string | null }[];
  validations?: { decision?: string; comment?: string | null }[];
}): boolean {
  if (audience.status !== AudienceStatus.CONFIRMEE) return false;
  if (!isCemgRelatedAudience(audience)) return false;
  return !wasValidatedByChefForAccompaniment(audience);
}

/** Réception salle d'attente — Chef de Cabinet, autres bureaux, ou dossiers validés par le Chef. */
export function isSalleReceptionAudience(audience: {
  status?: string;
  priority: string;
  visitTarget?: { role?: string } | null;
  statusHistory?: { toStatus?: string; comment?: string | null }[];
  validations?: { decision?: string; comment?: string | null }[];
}): boolean {
  if (wasValidatedByChefForAccompaniment(audience)) return true;
  return !isCemgRelatedAudience(audience);
}

/** @deprecated Utiliser isSalleReceptionAudience */
export function isNonCemgSalleReceptionAudience(audience: {
  priority: string;
  visitTarget?: { role?: string } | null;
}): boolean {
  return !isCemgRelatedAudience(audience);
}
