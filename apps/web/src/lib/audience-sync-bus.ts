import type { NotificationSoundType } from '@/lib/notification-sounds';
import type { UserRole } from '@/types';

export type AudienceSyncEvent = {
  type: 'sync' | 'created' | 'updated' | 'confirmed' | 'reception-completed' | 'accompaniment-completed';
  audienceId?: string;
  /** Jouer le son immédiatement pour ces rôles (même navigateur / autre onglet). */
  alertRoles?: UserRole[];
  soundType?: NotificationSoundType;
  /** Son spécifique par rôle (prioritaire sur soundType). */
  alertSoundByRole?: Partial<Record<UserRole, NotificationSoundType>>;
};

const CHANNEL = 'audax-audience-sync';
const EVENT_NAME = 'audax-audience-sync';

export function notifyAudienceSync(event: AudienceSyncEvent = { type: 'sync' }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AudienceSyncEvent>(EVENT_NAME, { detail: event }));
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage(event);
    bc.close();
  } catch {
    // BroadcastChannel indisponible (SSR / navigateurs restreints)
  }
}

/** Alertes sonores instantanées à la création d'une audience. */
export function buildCreateAudienceAlertSync(
  visitTargetRole?: UserRole,
  priority?: string,
): Pick<AudienceSyncEvent, 'alertRoles' | 'alertSoundByRole' | 'soundType'> {
  const alertRoles: UserRole[] = [];
  const alertSoundByRole: Partial<Record<UserRole, NotificationSoundType>> = {};

  // Circuit CEMG : à la création, seul le Protocol est alerté (le CEMG intervient après transmission).
  if (visitTargetRole === 'CEMG') {
    alertRoles.push('PROTOCOL');
    alertSoundByRole.PROTOCOL = priority === 'PRIORITE_0' ? 'CRITICAL' : 'INFO';
  }

  if (visitTargetRole !== 'CEMG' && priority !== 'PRIORITE_0') {
    alertRoles.push('CHEF');
    alertSoundByRole.CHEF = 'WARNING';
  }

  return {
    alertRoles: alertRoles.length ? alertRoles : undefined,
    alertSoundByRole: Object.keys(alertSoundByRole).length ? alertSoundByRole : undefined,
    soundType: priority === 'PRIORITE_0' ? 'CRITICAL' : 'INFO',
  };
}

/** Alertes sonores lors d'une transmission (Protocol → Cabinet ou CEMG → DirCab). */
export function buildForwardAlertSync(
  fromCemgDelegation: boolean,
): Pick<AudienceSyncEvent, 'alertRoles' | 'alertSoundByRole' | 'soundType'> {
  if (fromCemgDelegation) {
    return {
      alertRoles: ['CHEF'],
      alertSoundByRole: { CHEF: 'WARNING' },
      soundType: 'WARNING',
    };
  }

  return {
    alertRoles: ['CEMG'],
    alertSoundByRole: { CEMG: 'WARNING' },
    soundType: 'WARNING',
  };
}

/** Alertes sonores après validation (CEMG → Protocol, Chef → Salle). */
export function buildValidationAlertSync(
  decision: 'APPROUVE' | 'REJETE',
  validatorRole?: UserRole,
): Pick<AudienceSyncEvent, 'alertRoles' | 'alertSoundByRole' | 'soundType'> | undefined {
  if (decision !== 'APPROUVE' || !validatorRole) return undefined;

  if (validatorRole === 'CEMG') {
    return {
      alertRoles: ['PROTOCOL'],
      alertSoundByRole: { PROTOCOL: 'SUCCESS' },
      soundType: 'SUCCESS',
    };
  }

  if (validatorRole === 'CHEF') {
    return {
      alertRoles: ['SALLE_ATTENTE'],
      alertSoundByRole: { SALLE_ATTENTE: 'INFO' },
      soundType: 'INFO',
    };
  }

  return undefined;
}

/** Protocol confirme le suivi — alerte la salle d'attente. */
export function buildProtocolFollowUpAlertSync(): Pick<
  AudienceSyncEvent,
  'alertRoles' | 'alertSoundByRole' | 'soundType'
> {
  return {
    alertRoles: ['SALLE_ATTENTE'],
    alertSoundByRole: { SALLE_ATTENTE: 'WARNING' },
    soundType: 'WARNING',
  };
}

export function subscribeAudienceSync(callback: (event: AudienceSyncEvent) => void) {
  if (typeof window === 'undefined') return () => {};

  const onCustom = (e: Event) => {
    callback((e as CustomEvent<AudienceSyncEvent>).detail);
  };
  window.addEventListener(EVENT_NAME, onCustom);

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (message: MessageEvent<AudienceSyncEvent>) => callback(message.data);
  } catch {
    // ignore
  }

  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    bc?.close();
  };
}
