import type { AccompaniedPerson, Audience } from '@/types';
import type { AudienceApiRecord } from '@/lib/api-client';

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
