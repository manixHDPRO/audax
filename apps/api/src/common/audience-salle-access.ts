export const ACCOMPANIMENT_HISTORY_PREFIX = 'Accompagné au bureau';
export const RESCHEDULE_HISTORY_PREFIX = 'Replanifiée au';
export const PRESENCE_CONFIRMED_PREFIX = 'Présence confirmée —';

type HistoryEntry = {
  comment?: string | null;
  createdAt: Date | string;
};

export function getLastHistoryTimestamp(
  entries: HistoryEntry[] | undefined,
  commentPrefix: string,
): Date | null {
  if (!entries?.length) return null;

  let latest: Date | null = null;
  for (const entry of entries) {
    if (!entry.comment?.startsWith(commentPrefix)) continue;
    const at = new Date(entry.createdAt);
    if (!latest || at > latest) latest = at;
  }
  return latest;
}

/** Une audience doit réapparaître en salle d'attente après reprogrammation post-accompagnement. */
export function needsSalleAccompanimentAgain(entries: HistoryEntry[] | undefined): boolean {
  const lastAccompaniment = getLastHistoryTimestamp(entries, ACCOMPANIMENT_HISTORY_PREFIX);
  if (!lastAccompaniment) return true;

  const lastReschedule = getLastHistoryTimestamp(entries, RESCHEDULE_HISTORY_PREFIX);
  if (lastReschedule && lastReschedule > lastAccompaniment) return true;

  return false;
}

export function isTimestampOnDay(value: Date | string, dayStart: Date, dayEnd: Date): boolean {
  const at = new Date(value);
  return at >= dayStart && at < dayEnd;
}

/** Présence confirmée par la salle après la dernière reprogrammation. */
export function isRequesterPresenceConfirmedForReschedule(
  entries: HistoryEntry[] | undefined,
): boolean {
  const lastReschedule = getLastHistoryTimestamp(entries, RESCHEDULE_HISTORY_PREFIX);
  if (!lastReschedule) return false;

  const lastPresence = getLastHistoryTimestamp(entries, PRESENCE_CONFIRMED_PREFIX);
  return lastPresence != null && lastPresence >= lastReschedule;
}

/** Audience reprogrammée EN_ATTENTE en attente de confirmation de présence en salle. */
export function needsRequesterPresenceConfirmation(entries: HistoryEntry[] | undefined): boolean {
  const lastReschedule = getLastHistoryTimestamp(entries, RESCHEDULE_HISTORY_PREFIX);
  if (!lastReschedule) return false;
  return !isRequesterPresenceConfirmedForReschedule(entries);
}
