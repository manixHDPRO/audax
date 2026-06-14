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

export function describeStatusHistoryEntry(entry: AudienceStatusHistoryEntry): {
  title: string;
  detail?: string;
} {
  const toLabel = STATUS_LABELS[entry.toStatus];

  if (!entry.fromStatus) {
    return { title: 'Demande enregistrée', detail: entry.comment ?? toLabel };
  }

  switch (entry.toStatus) {
    case 'VALIDEE':
      return { title: 'Audience validée', detail: entry.comment ?? toLabel };
    case 'REJETEE':
      return { title: 'Audience rejetée', detail: entry.comment ?? toLabel };
    case 'DEJA_ENVOYE':
      return { title: 'Transmise au Dircab', detail: entry.comment ?? toLabel };
    case 'PLANIFIEE':
      return { title: 'Audience reprogrammée', detail: entry.comment ?? toLabel };
    case 'EN_ANALYSE':
      return { title: 'Mise en analyse', detail: entry.comment ?? toLabel };
    default: {
      const fromLabel = STATUS_LABELS[entry.fromStatus];
      return {
        title: `Passage : ${fromLabel} → ${toLabel}`,
        detail: entry.comment ?? undefined,
      };
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
