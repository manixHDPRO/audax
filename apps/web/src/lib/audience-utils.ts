import type { AccompaniedPerson, Audience, AudienceStatus, AudienceStatusHistoryEntry, AudienceValidationEntry } from '@/types';
import { STATUS_LABELS } from '@/types';
import type { AudienceApiRecord } from '@/lib/api-client';

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
    case 'PLANIFIEE':
      return historyEntryDisplay('Audience reprogrammée', entry.comment ?? toLabel);
    case 'CONFIRMEE':
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

export function mapApiAudience(record: AudienceApiRecord): Audience {
  return {
    id: record.id,
    reference: record.reference,
    subject: record.subject,
    motive: record.motive,
    requesterName: record.requesterName,
    requesterOrg: record.requesterOrg ?? undefined,
    status: record.status as Audience['status'],
    priority: record.priority as Audience['priority'],
    confidentiality: record.confidentiality as Audience['confidentiality'],
    category: record.category,
    scheduledAt: record.scheduledAt ?? undefined,
    createdAt: record.createdAt,
    room: record.room ?? undefined,
    visitors: record.visitors,
    createdBy: record.createdBy ?? undefined,
    visitTarget: record.visitTarget ?? undefined,
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

/** Audience transmise au Chef de Cabinet (Protocol ou CEMG). */
export function wasTransmittedToCabinet(
  audience: Pick<Audience, 'statusHistory'>,
): boolean {
  return (
    audience.statusHistory?.some(
      (entry) =>
        entry.toStatus === 'DEJA_ENVOYE' &&
        (entry.comment === 'Transmise au Cabinet' || entry.comment === 'Transmise au Dircab'),
    ) ?? false
  );
}

/** Dossier en cours de traitement au Cabinet — « Clôturer » remplace « Rejeter ». */
export function isAudienceAtCabinet(audience: Pick<Audience, 'status' | 'statusHistory'>): boolean {
  if (!wasTransmittedToCabinet(audience)) return false;
  return audience.status === 'DEJA_ENVOYE' || audience.status === 'EN_ANALYSE';
}

/** Le CEMG a délégué explicitement via « Voir le DirCab ». */
export function hasCemgDircabDelegation(audience: Pick<Audience, 'validations'>): boolean {
  return (
    audience.validations?.some(
      (v) => v.decision === 'EN_ATTENTE' && v.comment === 'Transmise au Dircab',
    ) ?? false
  );
}

/** Audience confiée au Chef de Cabinet (hors P0 en attente de délégation CEMG). */
export function isCemgCabinetHistoryAudience(audience: Audience, role?: string): boolean {
  if (role !== 'CEMG') return false;

  if (audience.status === 'DEJA_ENVOYE' || audience.status === 'EN_ANALYSE') {
    if (audience.priority === 'PRIORITE_0' && !hasCemgDircabDelegation(audience)) {
      return false;
    }
    return true;
  }

  return ['TERMINEE', 'REJETEE', 'ARCHIVEE'].includes(audience.status);
}

/** Fil d'attente actif du CEMG — exclut les dossiers non transmis par le Protocol. */
export function isInCemgWaitingQueue(audience: Audience, role?: string): boolean {
  if (role !== 'CEMG') return true;

  // Tant que le Protocol n'a pas transmis, le dossier reste hors pilotage CEMG.
  if (audience.status === 'EN_ATTENTE') return false;

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

/** Audience visible sur le pilotage / listes CEMG (après transmission Protocol). */
export function isCemgPilotageAudience(audience: Audience, role?: string): boolean {
  if (role !== 'CEMG') return true;
  if (audience.status === 'EN_ATTENTE') return false;
  return isInCemgWaitingQueue(audience, role) || isCemgCabinetHistoryAudience(audience, role);
}
