export type AudienceSyncEvent = {
  type: 'sync' | 'updated' | 'confirmed' | 'reception-completed' | 'accompaniment-completed';
  audienceId?: string;
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
