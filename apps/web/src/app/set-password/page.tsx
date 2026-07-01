'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Hexagon, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validatePasswordTokenApi, setPasswordApi } from '@/lib/api-client';
import Link from 'next/link';

const inputClass =
  'w-full h-11 px-4 rounded-xl bg-carbon-900/50 border border-military-800/50 text-cream focus:outline-none focus:border-military-500 transition-all font-mono text-sm';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [email, setEmail] = useState('');
  const [type, setType] = useState<'INVITE' | 'RESET'>('INVITE');
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError('Lien invalide ou incomplet');
      setValidating(false);
      return;
    }

    validatePasswordTokenApi(token)
      .then((data) => {
        setEmail(data.email);
        setType(data.type);
      })
      .catch((err) => {
        setTokenError(err instanceof Error ? err.message : 'Lien invalide ou expiré');
      })
      .finally(() => setValidating(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      await setPasswordApi(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la définition du mot de passe');
    } finally {
      setLoading(false);
    }
  }

  const title = type === 'INVITE' ? 'Activez votre compte' : 'Nouveau mot de passe';

  return (
    <div className="min-h-screen flex bg-carbon-950 bg-command-grid relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-military-600/10 rounded-full blur-[120px]" />
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-military-600 to-military-900 items-center justify-center mb-6 border border-military-500/30">
              {done ? <CheckCircle2 className="w-10 h-10 text-green-400" /> : <Hexagon className="w-10 h-10 text-gold-400" />}
            </div>
            <h1 className="text-3xl font-bold tracking-[0.3em] text-cream mb-2">AUDAX</h1>
            <p className="text-sm text-cream/50">{done ? 'Compte activé' : title}</p>
          </div>

          <div className="glass-strong rounded-2xl p-8 space-y-6">
            {validating ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-military-400" />
              </div>
            ) : tokenError ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-red-400">{tokenError}</p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">Retour à la connexion</Button>
                </Link>
              </div>
            ) : done ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-cream/60">
                  Votre mot de passe a été enregistré. Vous pouvez maintenant vous connecter.
                </p>
                <Button className="w-full" onClick={() => router.push('/login')}>
                  Se connecter
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-cream/50 text-center">
                  Compte : <span className="text-cream">{email}</span>
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-military-500 uppercase tracking-[0.2em] ml-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/20 hover:text-military-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-military-500 uppercase tracking-[0.2em] ml-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputClass}
                    minLength={8}
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {type === 'INVITE' ? 'Activer mon compte' : 'Enregistrer le mot de passe'}
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-carbon-950">
        <Loader2 className="w-8 h-8 animate-spin text-military-400" />
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  );
}
