'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Hexagon, Shield, Eye, EyeOff, Lock, KeyRound, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, API_REQUIRED_MESSAGE, API_UNAVAILABLE_MESSAGE, getDefaultAppRoute } from '@/stores/auth-store';
import { checkApiHealth } from '@/lib/api-config';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@audax.fardc.cd');
  const [password, setPassword] = useState('Audax2026!');
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
      if (ok) router.push(getDefaultAppRoute(useAuthStore.getState().user?.role));
      else setError('Code 2FA invalide');
      return;
    }

    const result = await login(email, password);
    setLoading(false);

    if (result === 'ok') router.push(getDefaultAppRoute(useAuthStore.getState().user?.role));
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

          <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-8 space-y-5">
            <div className="flex items-center gap-2 text-xs text-cream/40 mb-2">
              <Shield className="w-3 h-3 text-military-400" />
              <span>{show2FAStep ? 'Entrez le code de votre authenticator' : 'Connexion sécurisée — Usage interne'}</span>
            </div>

            {!show2FAStep ? (
              <>
                <div>
                  <label className="text-xs font-medium text-cream/60 uppercase tracking-wider">Identifiant</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full h-11 px-4 rounded-xl bg-carbon-800 border border-carbon-600 text-cream focus:outline-none focus:border-military-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-cream/60 uppercase tracking-wider">Mot de passe</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 px-4 pr-11 rounded-xl bg-carbon-800 border border-carbon-600 text-cream focus:outline-none focus:border-military-500 transition-all"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream cursor-pointer">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs font-medium text-cream/60 uppercase tracking-wider">Code 2FA</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1.5 w-full h-14 px-4 rounded-xl bg-carbon-800 border border-gold-500/30 text-cream text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-gold-500 glow-gold transition-all"
                  placeholder="000000"
                  autoFocus
                  maxLength={6}
                  required
                />
                <button type="button" onClick={() => { cancel2FA(); setTotpCode(''); setError(''); }} className="mt-2 text-xs text-cream/40 hover:text-cream cursor-pointer">
                  ← Retour à la connexion
                </button>
              </div>
            )}

            {apiReady === false && !error && (
              <div className="rounded-xl border border-amber-800/40 bg-amber-950/30 p-3 space-y-2">
                <p className="text-sm text-amber-300/90 flex items-center gap-2">
                  {checkingApi ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <RefreshCw className="w-4 h-4 shrink-0" />
                  )}
                  {checkingApi ? 'Vérification de l\'API…' : API_UNAVAILABLE_MESSAGE}
                </p>
                <p className="text-xs text-cream/40">{API_REQUIRED_MESSAGE}</p>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => void probeApi()}>
                  <RefreshCw className="w-3.5 h-3.5" /> Réessayer la connexion API
                </Button>
              </div>
            )}

            {apiReady === true && (
              <p className="text-xs text-military-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-military-400 animate-pulse" />
                API connectée — prêt pour la connexion
              </p>
            )}

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400">{error}</motion.p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || apiReady === false || (show2FAStep && totpCode.length !== 6)}
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Vérification...' : show2FAStep ? 'Valider le code 2FA' : 'Accéder au centre de commandement'}
            </Button>

            {!show2FAStep && (
              <div className="pt-4 border-t border-carbon-700">
                <p className="text-[10px] text-cream/30 text-center leading-relaxed">
                  Mot de passe : Audax2026! — Activez la 2FA dans Paramètres
                </p>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
