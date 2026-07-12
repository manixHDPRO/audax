export interface SystemSecuritySettings {
  inactivityLockEnabled: boolean;
  inactivityTimeoutMinutes: number;
}

export const SYSTEM_SECURITY_UPDATED_EVENT = 'audax-system-security-updated';

export const INACTIVITY_TIMEOUT_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 heure' },
];

export function notifySystemSecurityUpdated(settings: SystemSecuritySettings) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<SystemSecuritySettings>(SYSTEM_SECURITY_UPDATED_EVENT, { detail: settings }),
  );
}

export function subscribeSystemSecurityUpdated(callback: (settings: SystemSecuritySettings) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    callback((event as CustomEvent<SystemSecuritySettings>).detail);
  };

  window.addEventListener(SYSTEM_SECURITY_UPDATED_EVENT, handler);
  return () => window.removeEventListener(SYSTEM_SECURITY_UPDATED_EVENT, handler);
}
