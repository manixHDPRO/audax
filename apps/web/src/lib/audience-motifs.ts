export const AUDIENCE_MOTIF_OPTIONS = [
  'Rendez-vous',
  'Visite de courtoisie',
  'Autre',
] as const;

export type AudienceMotifOption = (typeof AUDIENCE_MOTIF_OPTIONS)[number];

export function parseAudienceMotifFromSubject(subject: string): {
  motif: AudienceMotifOption;
  otherDetail: string;
} {
  const normalized = subject.trim();
  if (normalized === 'Rendez-vous' || normalized === 'Visite de courtoisie') {
    return { motif: normalized, otherDetail: '' };
  }
  if (normalized.startsWith('Autre — ')) {
    return { motif: 'Autre', otherDetail: normalized.slice('Autre — '.length) };
  }
  if (normalized === 'Autre') {
    return { motif: 'Autre', otherDetail: '' };
  }
  return { motif: 'Autre', otherDetail: normalized };
}

export function buildAudienceSubjectFromMotif(motif: string, otherDetail?: string): string {
  if (motif === 'Autre') {
    const detail = otherDetail?.trim();
    return detail ? `Autre — ${detail}` : 'Autre';
  }
  return motif;
}
