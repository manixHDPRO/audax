'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Hexagon, Lock, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unlockSessionApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

interface InactivityLockOverlayProps {
  onUnlock: () => void;
}

export function InactivityLockOverlay({ onUnlock }: InactivityLockOverlayProps) {
  const { user, accessToken, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      await unlockSessionApi(accessToken, password, totpCode.trim() || undefined);
      setPassword('');
      setTotpCode('');
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de déverrouiller la session');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-carbon-950/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactivity-lock-title"
    >
      <div className="absolute inset-0 bg-command-grid opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md mx-4 rounded-2xl border border-military-700/40 bg-carbon-900/90 p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <Hexagon className="w-14 h-14 text-military-600" />
            <Lock className="w-5 h-5 text-gold-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 id="inactivity-lock-title" className="text-xl font-bold text-cream font-display">
            Session en veille
          </h2>
          {user?.email ? (
            <p className="text-xs text-military-400 font-mono mt-3">{user.email}</p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="unlock-password" className="text-[10px] font-mono uppercase tracking-widest text-cream/40">
              Mot de passe
            </label>
            <div className="relative mt-1.5">
              <input
                id="unlock-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                className="w-full h-11 px-4 pr-11 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/30 hover:text-cream/60 cursor-pointer"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {user?.twoFactorEnabled ? (
            <div>
              <label htmlFor="unlock-totp" className="text-[10px] font-mono uppercase tracking-widest text-cream/40">
                Code 2FA
              </label>
              <input
                id="unlock-totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full h-11 px-4 mt-1.5 rounded-xl bg-carbon-800 border border-carbon-600 text-sm font-mono tracking-[0.3em] text-center focus:outline-none focus:border-military-500"
              />
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-red-400 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Vérification…
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Déverrouiller
              </>
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => void logout()}
          className={cn(
            'mt-4 w-full text-xs text-cream/35 hover:text-cream/60 transition-colors cursor-pointer',
          )}
        >
          Se déconnecter
        </button>
      </motion.div>
    </motion.div>
  );
}
