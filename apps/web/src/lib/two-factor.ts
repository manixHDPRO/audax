'use client';

import { authenticator } from 'otplib';

const STORAGE_KEY = 'audax-2fa-secrets';

interface TwoFactorRecord {
  secret: string;
  enabled: boolean;
}

function loadAll(): Record<string, TwoFactorRecord> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, TwoFactorRecord>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function is2FAEnabled(email: string): boolean {
  return loadAll()[email]?.enabled ?? false;
}

export function get2FASecret(email: string): string | null {
  const rec = loadAll()[email];
  return rec?.enabled ? rec.secret : null;
}

export function getPendingSecret(email: string): string | null {
  const rec = loadAll()[email];
  return rec && !rec.enabled ? rec.secret : null;
}

export function generate2FASecret(email: string): { secret: string; otpauth: string } {
  const secret = authenticator.generateSecret();
  const all = loadAll();
  all[email] = { secret, enabled: false };
  saveAll(all);
  const otpauth = authenticator.keyuri(email, 'AUDAX FARDC', secret);
  return { secret, otpauth };
}

export function enable2FA(email: string, code: string): boolean {
  const all = loadAll();
  const rec = all[email];
  if (!rec?.secret) return false;
  if (!authenticator.verify({ token: code, secret: rec.secret })) return false;
  all[email] = { secret: rec.secret, enabled: true };
  saveAll(all);
  return true;
}

export function disable2FA(email: string, code: string): boolean {
  const all = loadAll();
  const rec = all[email];
  if (!rec?.enabled) return false;
  if (!authenticator.verify({ token: code, secret: rec.secret })) return false;
  delete all[email];
  saveAll(all);
  return true;
}

export function verify2FACode(email: string, code: string): boolean {
  const secret = get2FASecret(email);
  if (!secret) return true;
  return authenticator.verify({ token: code, secret });
}

export async function generateQRDataUrl(otpauth: string): Promise<string> {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(otpauth);
}
