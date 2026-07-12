export const SYSTEM_SECURITY_SETTING_KEY = 'system_security';

export interface SystemSecuritySettings {
  inactivityLockEnabled: boolean;
  inactivityTimeoutMinutes: number;
}

export const DEFAULT_SYSTEM_SECURITY: SystemSecuritySettings = {
  inactivityLockEnabled: false,
  inactivityTimeoutMinutes: 15,
};

export const INACTIVITY_TIMEOUT_MIN = 1;
export const INACTIVITY_TIMEOUT_MAX = 120;
