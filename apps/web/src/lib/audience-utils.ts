import type { AccompaniedPerson, Audience, AudienceStatus, AudienceStatusHistoryEntry, AudienceValidationEntry, Room, UserRole } from '@/types';
import { STATUS_LABELS } from '@/types';
import type { AudienceApiRecord } from '@/lib/api-client';
import { extractGradeFromMotive } from '@/lib/military-grades';

function mapStatusHistory(
  entries?: AudienceApiRecord['statusHistory'],
): AudienceStatusHistoryEntry[] | undefined {
  if (!entries?.length) return undefined;
  return entries.map((entry) => ({
    id: entry.id,
    fromStatus: (entry.fromStatus as AudienceStatus | null | undefined) ?? null,
    toStatus: entry.toStatus as AudienceStatus,
    comment: entry.comment ?? undefined,
    changedBy: entry.changedBy,
    createdAt: entry.createdAt,
    changedByUser: entry.changedByUser ?? undefined,
  }));
}

function mapValidations(
  entries?: AudienceApiRecord['validations'],
): AudienceValidationEntry[] | undefined {
  if (!entries?.length) return undefined;
  return entries.map((entry) => ({
    id: entry.id,
    decision: entry.decision as AudienceValidationEntry['decision'],
    comment: entry.comment ?? undefined,
    level: entry.level,
    decidedAt: entry.decidedAt ?? undefined,
    createdAt: entry.createdAt,
    validator: entry.validator,
  }));
}

export function formatUserName(user?: { firstName: string; lastName: string }) {
  if (!user) return undefined;
  return `${user.firstName} ${user.lastName}`;
}

export function sortStatusHistoryNewestFirst(
  entries?: AudienceStatusHistoryEntry[],
): AudienceStatusHistoryEntry[] {
  if (!entries?.length) return [];
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getLatestStatusHistoryEntry(
  entries?: AudienceStatusHistoryEntry[],
): AudienceStatusHistoryEntry | undefined {
  return sortStatusHistoryNewestFirst(entries)[0];
}

function historyEntryDisplay(title: string, detail?: string | null): { title: string; detail?: string } {
  const normalizedDetail = detail?.trim();
  if (!normalizedDetail || normalizedDetail === title) {
    return { title };
  }
  return { title, detail: normalizedDetail };
}

export function describeStatusHistoryEntry(entry: AudienceStatusHistoryEntry): {
  title: string;
  detail?: string;
} {
  const toLabel = STATUS_LABELS[entry.toStatus];

  if (!entry.fromStatus) {
    return historyEntryDisplay('Demande enregistrée', entry.comment ?? toLabel);
  }

  if (entry.comment?.startsWith('Accompagné au bureau')) {
    return historyEntryDisplay('Accompagné au bureau', entry.comment);
  }

  switch (entry.toStatus) {
    case 'VALIDEE':
      return historyEntryDisplay('Audience validée', entry.comment ?? toLabel);
    case 'REJETEE':
      return historyEntryDisplay('Audience rejetée', entry.comment ?? toLabel);
    case 'DEJA_ENVOYE':
      if (entry.comment === 'Transmise au Dircab') {
        return historyEntryDisplay('Transmise au Dircab', entry.comment);
      }
      return historyEntryDisplay('Transmise au Cabinet', entry.comment ?? toLabel);
    case 'TRANSMIS_DIRCAB':
      return historyEntryDisplay('Transmise par le CEMG au DirCab', entry.comment ?? toLabel);
    case 'PLANIFIEE':
      return historyEntryDisplay('Audience reprogrammée', entry.comment ?? toLabel);
    case 'CONFIRMEE':
      if (entry.comment?.includes('Chef de Cabinet')) {
        return historyEntryDisplay('Validée par le Chef de Cabinet — accompagnement', entry.comment);
      }
      return historyEntryDisplay('Audience confirmée par le Protocol', entry.comment ?? toLabel);
    case 'TERMINEE':
      if (entry.comment?.startsWith('Audience clôturée')) {
        return historyEntryDisplay('Audience clôturée', entry.comment);
      }
      return historyEntryDisplay('Visiteur reçu — audience terminée', entry.comment ?? toLabel);
    case 'EN_ANALYSE':
      return historyEntryDisplay('Mise en analyse', entry.comment ?? toLabel);
    default: {
      const fromLabel = STATUS_LABELS[entry.fromStatus];
      return historyEntryDisplay(`Passage : ${fromLabel} → ${toLabel}`, entry.comment ?? undefined);
    }
  }
}

/** Préfixe date : JJMMAAAA (ex. 22052026 pour le 22/05/2026) */
export function getAudienceDatePrefix(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}${month}${year}`;
}

/** Référence du type AUD-JOURMOISANNEE-0001, numéro incrémenté par jour */
export function nextAudienceReference(existingReferences: string[], date = new Date()): string {
  const prefix = getAudienceDatePrefix(date);
  const pattern = new RegExp(`^AUD-${prefix}-(\\d{4})$`);
  const nums = existingReferences
    .map((ref) => {
      const match = ref.match(pattern);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `AUD-${prefix}-${String(next).padStart(4, '0')}`;
}

function mapVisitors(
  entries?: AudienceApiRecord['visitors'],
): Audience['visitors'] {
  if (!entries?.length) return undefined;
  return entries.map(({ visitor }) => ({
    visitor: {
      id: visitor.id,
      firstName: visitor.firstName,
      lastName: visitor.lastName,
      organization: visitor.organization ?? undefined,
      function: visitor.function ?? undefined,
      accessLevel: visitor.accessLevel ?? 'STANDARD',
      badgeCode: visitor.badgeCode ?? undefined,
    },
  }));
}

export function mapApiAudience(record: AudienceApiRecord): Audience {
  return {
    id: record.id,
    reference: record.reference,
    subject: record.subject,
    motive: record.motive,
    requesterName: record.requesterName,
    requesterOrg: record.requesterOrg ?? undefined,
    grade: record.requesterGrade ?? extractGradeFromMotive(record.motive) ?? undefined,
    status: record.status as Audience['status'],
    priority: record.priority as Audience['priority'],
    confidentiality: record.confidentiality as Audience['confidentiality'],
    category: record.category,
    scheduledAt: record.scheduledAt ?? undefined,
    createdAt: record.createdAt,
    room: record.room
      ? { ...record.room, status: record.room.status as Room['status'] }
      : undefined,
    visitors: mapVisitors(record.visitors),
    createdBy: record.createdBy ?? undefined,
    visitTarget: record.visitTarget
      ? { ...record.visitTarget, role: record.visitTarget.role as UserRole | undefined }
      : undefined,
    statusHistory: mapStatusHistory(record.statusHistory),
    validations: mapValidations(record.validations),
  };
}

export function formatAccompaniedPerson(person: AccompaniedPerson | string): string {
  if (typeof person === 'string') return person;
  if (person.grade) return `${person.grade} ${person.name}`;
  return person.name;
}

export function normalizeAccompaniedPersons(
  persons?: (AccompaniedPerson | string)[],
): AccompaniedPerson[] {
  if (!persons?.length) return [];
  return persons.map((p) => (typeof p === 'string' ? { name: p } : p));
}

/** Transmission Protocol → Cabinet CEMG (pas encore déléguée au DirCab). */
export function wasTransmittedByProtocol(
  audience: Pick<Audience, 'status' | 'statusHistory' | 'validations'>,
): boolean {
  if (audience.status === 'DEJA_ENVOYE') return true;
  return (
    audience.validations?.some(
      (v) => v.decision === 'EN_ATTENTE' && v.comment === 'Transmise au Cabinet',
    ) ?? false
  );
}

/** Audience transmise au Chef de Cabinet (délégation CEMG ou legacy). */
export function wasTransmittedToCabinet(
  audience: Pick<Audience, 'status' | 'statusHistory' | 'validations'>,
): boolean {
  if (audience.status === 'TRANSMIS_DIRCAB') return true;

  const fromValidations =
    audience.validations?.some(
      (v) => v.decision === 'EN_ATTENTE' && v.comment === 'Transmise au Dircab',
    ) ?? false;
  if (fromValidations) return true;

  return (
    audience.statusHistory?.some(
      (entry) =>
        entry.toStatus === 'TRANSMIS_DIRCAB' ||
        (entry.toStatus === 'DEJA_ENVOYE' && entry.comment === 'Transmise au Dircab'),
    ) ?? false
  );
}

/** Le CEMG a délégué explicitement via « Voir le DirCab ». */
export function hasCemgDircabDelegation(audience: Pick<Audience, 'validations'>): boolean {
  return (
    audience.validations?.some(
      (v) => v.decision === 'EN_ATTENTE' && v.comment === 'Transmise au Dircab',
    ) ?? false
  );
}

/** Dossier confié au DirCab par le CEMG (hors simple transmission Protocol). */
export function isDelegatedToDircab(
  audience: Pick<Audience, 'statusHistory' | 'validations'> & { status?: Audience['status'] },
): boolean {
  if (audience.status === 'TRANSMIS_DIRCAB') return true;
  if (hasCemgDircabDelegation(audience)) return true;
  return (
    audience.statusHistory?.some(
      (entry) =>
        entry.toStatus === 'TRANSMIS_DIRCAB' ||
        (entry.toStatus === 'DEJA_ENVOYE' && entry.comment === 'Transmise au Dircab'),
    ) ?? false
  );
}

/** Dossier en cours de traitement au Cabinet — « Clôturer » remplace « Rejeter ». */
export function isAudienceAtCabinet(
  audience: Pick<Audience, 'status' | 'statusHistory' | 'validations'>,
): boolean {
  if (audience.status === 'TRANSMIS_DIRCAB') return true;
  if (audience.status === 'EN_ANALYSE' && isDelegatedToDircab(audience)) return true;
  return false;
}

/** Audience confiée au Chef de Cabinet après délégation CEMG (suivi DirCab). */
export function isCemgCabinetHistoryAudience(audience: Audience, role?: string): boolean {
  if (role !== 'CEMG') return false;

  if (isDelegatedToDircab(audience)) {
    return ['TRANSMIS_DIRCAB', 'EN_ANALYSE', 'TERMINEE', 'REJETEE', 'ARCHIVEE'].includes(audience.status);
  }

  return ['TERMINEE', 'REJETEE', 'ARCHIVEE'].includes(audience.status);
}

/** Audiences actives pour les KPI du Command Dashboard (store déjà filtré par l'API). */
export function getCommandDashboardMetricsPool(audiences: Audience[], role?: string): Audience[] {
  if (role === 'ADMIN') {
    return audiences;
  }

  const nonTerminal = audiences.filter(
    (a) => !['TERMINEE', 'REJETEE', 'ARCHIVEE'].includes(a.status),
  );

  if (role === 'CEMG') {
    return nonTerminal.filter((a) => !isCemgCabinetHistoryAudience(a, 'CEMG'));
  }

  if (role === 'CHEF') {
    return nonTerminal.filter((a) => isChefPilotageAudience(a, 'CHEF'));
  }

  if (role === 'PROTOCOL') {
    return nonTerminal.filter((a) => isCemgRelatedAudience(a));
  }

  return nonTerminal;
}

/** Compteurs KPI du Command Dashboard. */
export function getCommandDashboardStatCounts(audiences: Audience[], role?: string) {
  const pool = getCommandDashboardMetricsPool(audiences, role);
  const isCemg = role === 'CEMG';

  return {
    pending: isCemg
      ? countAudiencesByStatus(pool, 'DEJA_ENVOYE')
      : countAudiencesByStatus(pool, 'EN_ATTENTE') + countAudiencesByStatus(pool, 'DEJA_ENVOYE'),
    inAnalysis: countAudiencesByStatus(pool, 'EN_ANALYSE'),
    validated:
      countAudiencesByStatus(pool, 'VALIDEE') +
      countAudiencesByStatus(pool, 'PLANIFIEE') +
      countAudiencesByStatus(pool, 'CONFIRMEE'),
    critical: pool.filter((a) => a.priority === 'CRITIQUE').length,
  };
}

function countAudiencesByStatus(audiences: Audience[], status: Audience['status']) {
  return audiences.filter((a) => a.status === status).length;
}

function isActiveAudience(audience: Audience) {
  return !['TERMINEE', 'REJETEE', 'ARCHIVEE'].includes(audience.status);
}

export function filterAudiencesByOrgUnit(
  audiences: Audience[],
  filters: { cabinetId?: string; bureauId?: string },
): Audience[] {
  const { cabinetId, bureauId } = filters;
  if (!cabinetId && !bureauId) return audiences;

  return audiences.filter((audience) => {
    if (cabinetId && audience.visitTarget?.cabinetId !== cabinetId) return false;
    if (bureauId && audience.visitTarget?.bureauId !== bureauId) return false;
    return true;
  });
}

export function getVisitTargetOrgLabel(audience: Audience): string {
  const target = audience.visitTarget;
  if (!target) return '—';
  if (target.cabinet?.name) return target.cabinet.name;
  if (target.bureau?.name) return target.bureau.name;
  return '—';
}

/** Vue d'ensemble admin — toutes les audiences sans restriction de circuit. */
export function getAdminAudienceOverviewStats(audiences: Audience[]) {
  const active = audiences.filter(isActiveAudience);

  return {
    total: audiences.length,
    active: active.length,
    pending: countAudiencesByStatus(audiences, 'EN_ATTENTE') + countAudiencesByStatus(audiences, 'DEJA_ENVOYE'),
    inAnalysis: countAudiencesByStatus(audiences, 'EN_ANALYSE'),
    validated:
      countAudiencesByStatus(audiences, 'VALIDEE') +
      countAudiencesByStatus(audiences, 'PLANIFIEE') +
      countAudiencesByStatus(audiences, 'CONFIRMEE'),
    completed: countAudiencesByStatus(audiences, 'TERMINEE'),
    critical: active.filter((a) => a.priority === 'CRITIQUE').length,
    priority0: active.filter((a) => a.priority === 'PRIORITE_0').length,
  };
}

/** Fil d'attente admin — dossiers nécessitant encore une action. */
export function getAdminOperationalAudiences(audiences: Audience[]) {
  return audiences.filter((a) =>
    ['EN_ATTENTE', 'DEJA_ENVOYE', 'EN_ANALYSE', 'TRANSMIS_DIRCAB', 'VALIDEE', 'PLANIFIEE', 'CONFIRMEE'].includes(
      a.status,
    ),
  );
}

/** Fil d'attente actif du CEMG — exclut les dossiers non transmis par le Protocol. */
export function isInCemgWaitingQueue(audience: Audience, role?: string): boolean {
  if (role !== 'CEMG') return true;

  // Tant que le Protocol n'a pas transmis, le dossier reste hors pilotage CEMG.
  if (audience.status === 'EN_ATTENTE') return false;

  if (!isCemgRelatedAudience(audience)) return false;

  const activeStatuses: AudienceStatus[] = [
    'DEJA_ENVOYE',
    'EN_ANALYSE',
    'PLANIFIEE',
    'VALIDEE',
    'CONFIRMEE',
  ];
  if (!activeStatuses.includes(audience.status)) return false;
  if (isCemgCabinetHistoryAudience(audience, role)) return false;

  return true;
}

/** Priorité 0 — jamais visible côté Chef de Cabinet. */
export function isPriorite0HiddenFromChef(audience: Pick<Audience, 'priority'>, role?: string): boolean {
  return role === 'CHEF' && audience.priority === 'PRIORITE_0';
}

/** Chef en attente : Protocol a transmis au Cabinet, le CEMG n'a pas encore délégué au DirCab (hors P0). */
export function isChefAwaitingCemgDelegation(audience: Audience): boolean {
  if (audience.status !== 'DEJA_ENVOYE') return false;
  if (audience.priority === 'PRIORITE_0') return false;
  if (!isCemgRelatedAudience(audience)) return false;
  return wasTransmittedByProtocol(audience) && !isDelegatedToDircab(audience);
}

/** Fil d'attente Chef de Cabinet — après transmission Protocol ou délégation CEMG. */
export function isChefCabinetQueue(audience: Audience, role?: string): boolean {
  if (role !== 'CHEF') return true;
  if (isPriorite0HiddenFromChef(audience, role)) return false;
  if (isChefAwaitingCemgDelegation(audience)) return true;
  if (audience.status === 'TRANSMIS_DIRCAB') return true;
  if (audience.status === 'DEJA_ENVOYE' && !isCemgRelatedAudience(audience)) return true;
  if (audience.status === 'EN_ATTENTE' && !isCemgRelatedAudience(audience)) return true;
  if (audience.status === 'EN_ANALYSE' && isDelegatedToDircab(audience)) return true;
  return false;
}

/** Dossiers visibles dans le pilotage Cabinet (actifs + historique récent). */
export function isChefPilotageAudience(audience: Audience, role?: string): boolean {
  if (role !== 'CHEF') return true;
  if (isPriorite0HiddenFromChef(audience, role)) return false;
  if (isChefCabinetQueue(audience, role)) return true;
  return ['VALIDEE', 'PLANIFIEE', 'CONFIRMEE', 'TERMINEE', 'REJETEE'].includes(audience.status);
}

/** Espace secrétariat — planification et suivi opérationnel. */
export function isSecretariatWorkspaceAudience(audience: Audience, role?: string): boolean {
  if (role !== 'SECRETAIRE' && role !== 'ASSISTANT') return true;
  return ['VALIDEE', 'PLANIFIEE', 'CONFIRMEE', 'EN_ATTENTE', 'DEJA_ENVOYE', 'TRANSMIS_DIRCAB', 'EN_ANALYSE'].includes(
    audience.status,
  );
}

/** Vue consultation (Observateur) — lecture seule. */
export function isConsultationAudience(audience: Audience): boolean {
  return !['ARCHIVEE'].includes(audience.status);
}

/** Audience visible sur le pilotage / listes CEMG (après transmission Protocol). */
export function isCemgPilotageAudience(audience: Audience, role?: string): boolean {
  if (role !== 'CEMG') return true;
  if (audience.status === 'EN_ATTENTE') return false;
  return isInCemgWaitingQueue(audience, role) || isCemgCabinetHistoryAudience(audience, role);
}

/** Réception salle d'attente — Chef de Cabinet, autres bureaux, ou dossiers validés par le Chef. */
export function isSalleReceptionAudience(audience: Audience): boolean {
  if (wasValidatedByChefForAccompaniment(audience)) return true;
  return !isCemgRelatedAudience(audience);
}

/** Audience relevant du circuit CEMG (réception / suivi Protocol). Hors dossiers délégués au DirCab. */
export function isCemgRelatedAudience(audience: {
  status?: Audience['status'];
  priority: string;
  visitTarget?: { role?: string } | null;
  statusHistory?: AudienceStatusHistoryEntry[];
  validations?: AudienceValidationEntry[];
}): boolean {
  if (isDelegatedToDircab(audience)) return false;
  return audience.visitTarget?.role === 'CEMG';
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
export function isProtocolCemgConfirmQueue(audience: Audience): boolean {
  if (audience.status !== 'VALIDEE' && audience.status !== 'PLANIFIEE') return false;
  if (!isCemgRelatedAudience(audience)) return false;
  return !wasValidatedByChefForAccompaniment(audience);
}

/** Réception Protocol — audiences CEMG confirmées (hors circuit Chef de Cabinet). */
export function isProtocolCemgReceptionQueue(audience: Audience): boolean {
  if (audience.status !== 'CONFIRMEE') return false;
  if (!isCemgRelatedAudience(audience)) return false;
  return !wasValidatedByChefForAccompaniment(audience);
}

/** Dossier au Cabinet CEMG visible par le Protocol (hors validations Chef). */
export function isProtocolCemgCabinetTracking(audience: Audience): boolean {
  if (!['DEJA_ENVOYE', 'TRANSMIS_DIRCAB', 'EN_ANALYSE'].includes(audience.status)) return false;
  if (!isCemgRelatedAudience(audience)) return false;
  return !wasValidatedByChefForAccompaniment(audience);
}
