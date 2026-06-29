'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Hexagon, Shield, Eye, EyeOff, Lock, KeyRound, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, API_REQUIRED_MESSAGE, API_UNAVAILABLE_MESSAGE, getDefaultAppRoute } from '@/stores/auth-store';
import { checkApiHealth } from '@/lib/api-config';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [checkingApi, setCheckingApi] = useState(false);
  const { login, verify2FA, cancel2FA, pending2FA } = useAuthStore();
  const router = useRouter();

  const probeApi = useCallback(async () => {
    setCheckingApi(true);
    const ok = await checkApiHealth();
    setApiReady(ok);
    setCheckingApi(false);
    return ok;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const run = async () => {
      const ok = await checkApiHealth();
      if (cancelled) return;
      setApiReady(ok);
      if (!ok) {
        timer = setInterval(async () => {
          const ready = await checkApiHealth();
          if (cancelled) return;
          setApiReady(ready);
          if (ready && timer) clearInterval(timer);
        }, 2500);
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (pending2FA) {
      const ok = await verify2FA(totpCode);
      setLoading(false);
      if (ok) {
        const { user, permissions } = useAuthStore.getState();
        router.push(getDefaultAppRoute(user?.role, permissions));
      }
      else setError('Code 2FA invalide');
      return;
    }

    const result = await login(email, password);
    setLoading(false);

    if (result === 'ok') {
      const { user, permissions } = useAuthStore.getState();
      router.push(getDefaultAppRoute(user?.role, permissions));
    }
    else if (result === '2fa') setTotpCode('');
    else if (result === 'api_error') {
      setApiReady(false);
      setError(`${API_UNAVAILABLE_MESSAGE} ${API_REQUIRED_MESSAGE}`);
    }
    else setError('Identifiants invalides');
  };

  const show2FAStep = !!pending2FA;

  return (
    <div className="min-h-screen flex bg-carbon-950 bg-command-grid relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-military-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-500/5 rounded-full blur-[100px]" />

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-military-600 to-military-900 items-center justify-center glow-green mb-6 border border-military-500/30"
            >
              {show2FAStep ? <KeyRound className="w-10 h-10 text-gold-400" /> : <Hexagon className="w-10 h-10 text-gold-400" />}
            </motion.div>
            <h1 className="text-3xl font-bold tracking-[0.3em] text-cream mb-2">AUDAX</h1>
            <p className="text-sm text-cream/50">
              {show2FAStep ? 'Vérification 2FA requise' : 'Plateforme de gestion stratégique des audiences'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-8 space-y-6 tactical-corners scanlines relative">
            <div className="absolute top-0 right-0 p-2">
              <div className="text-[8px] font-mono text-military-500 uppercase tracking-widest">Secure_Auth_v1.0</div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-military-500 uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>{show2FAStep ? 'Verification 2FA active' : 'Terminal de Connexion Sécurisé'}</span>
            </div>

            {!show2FAStep ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-military-500 uppercase tracking-[0.2em] ml-1">Identifiant</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="fardc@.cd"
                    autoComplete="username"
                    className="w-full h-11 px-4 rounded-xl bg-carbon-900/50 border border-military-800/50 text-cream focus:outline-none focus:border-military-500 focus:glow-green transition-all font-mono text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-military-500 uppercase tracking-[0.2em] ml-1">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full h-11 px-4 pr-11 rounded-xl bg-carbon-900/50 border border-military-800/50 text-cream focus:outline-none focus:border-military-500 focus:glow-green transition-all font-mono text-sm"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/20 hover:text-military-400 cursor-pointer transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] font-mono font-bold text-gold-500 uppercase tracking-[0.2em] text-center block">Code de Sécurité 2FA</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full h-16 px-4 rounded-xl bg-carbon-900/50 border border-gold-500/30 text-gold-400 text-center text-3xl tracking-[0.6em] font-mono focus:outline-none focus:border-gold-500 glow-gold transition-all"
                  placeholder="000000"
                  autoFocus
                  maxLength={6}
                  required
                />
                <button type="button" onClick={() => { cancel2FA(); setTotpCode(''); setError(''); }} className="w-full text-[10px] font-mono text-cream/30 hover:text-cream uppercase tracking-widest cursor-pointer transition-colors py-2">
                  ← Annuler et Retour
                </button>
              </div>
            )}

            {apiReady === false && !error && (
              <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 space-y-3 tactical-corners">
                <p className="text-[10px] font-mono text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                  {checkingApi ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <RefreshCw className="w-4 h-4 shrink-0" />
                  )}
                  {checkingApi ? 'Synchronisation...' : 'Lien API Interrompu'}
                </p>
                <Button type="button" variant="tactical" size="sm" className="w-full border-amber-800/50 text-amber-500 hover:border-amber-500" onClick={() => void probeApi()}>
                  Réinitialiser la Liaison
                </Button>
              </div>
            )}

            {apiReady === true && (
              <div className="flex items-center justify-between px-1">
                <p className="text-[9px] font-mono text-military-500 flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-military-500 animate-pulse shadow-[0_0_5px_rgba(74,124,74,0.8)]" />
                  Lien API Établi
                </p>
                <span className="text-[9px] font-mono text-military-800">SECURE_CHANNEL_ALPHA</span>
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-3 rounded-lg bg-red-950/20 border border-red-900/50">
                <p className="text-xs font-mono text-red-400 uppercase tracking-tighter text-center">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              variant={show2FAStep ? "gold" : "default"}
              className={cn(
                "w-full h-14 text-sm font-bold uppercase tracking-[0.2em] transition-all duration-500",
                !show2FAStep && "glow-green-strong"
              )}
              disabled={loading || apiReady === false || (show2FAStep && totpCode.length !== 6)}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  {show2FAStep ? 'Authentifier' : 'Initialiser Connexion'}
                </>
              )}
            </Button>

            {!show2FAStep && (
              <div className="pt-6 border-t border-military-900/50">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-mono text-military-800 uppercase">Cabinet Chef EMG</span>
                  <span className="text-[8px] font-mono text-military-800 uppercase">FARDC © 2026</span>
                </div>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
