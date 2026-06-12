'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { setup2FAApi, enable2FAApi, disable2FAApi } from '@/lib/api-client';

export function TwoFactorSetup() {
  const { user, accessToken, refreshUser } = useAuthStore();
  const [enabled, setEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [step, setStep] = useState<'idle' | 'setup'>('idle');
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEnabled(user?.twoFactorEnabled ?? false);
  }, [user?.twoFactorEnabled]);

  const startSetup = async () => {
    if (!accessToken) return;

    setError('');
    setLoading(true);

    try {
      const data = await setup2FAApi(accessToken);
      setQrUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la configuration 2FA');
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async () => {
    if (!accessToken) return;

    setError('');
    setLoading(true);

    try {
      await enable2FAApi(accessToken, code);
      setEnabled(true);
      setStep('idle');
      setCode('');
      await refreshUser();
    } catch {
      setError('Code invalide — vérifiez votre application authenticator');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!accessToken) return;

    if (code.length !== 6) {
      setError('Entrez votre code 2FA à 6 chiffres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await disable2FAApi(accessToken, code);
      setEnabled(false);
      setCode('');
      setStep('idle');
      await refreshUser();
    } catch {
      setError('Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? <ShieldCheck className="w-5 h-5 text-military-400" /> : <Shield className="w-5 h-5 text-cream/40" />}
          Double authentification (2FA)
        </CardTitle>
        <CardDescription>
          {enabled
            ? 'Votre compte est protégé par TOTP (Google Authenticator, Authy…)'
            : 'Renforcez la sécurité avec un code à 6 chiffres'}
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${enabled ? 'bg-military-900/50 text-military-400 border border-military-600/30' : 'bg-carbon-800 text-cream/50'}`}>
          {enabled ? 'Activé' : 'Désactivé'}
        </div>

        <AnimatePresence mode="wait">
          {step === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {qrUrl && (
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR Code 2FA" className="w-48 h-48" />
                </div>
              )}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-carbon-800 font-mono text-xs break-all">
                <span className="flex-1 text-cream/70">{secret}</span>
                <button type="button" onClick={copySecret} className="text-military-400 hover:text-military-300 cursor-pointer">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-cream/40">Scannez le QR code, puis entrez le code généré :</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full h-12 text-center text-2xl tracking-[0.5em] font-mono rounded-xl bg-carbon-800 border border-carbon-600 focus:outline-none focus:border-military-500"
                maxLength={6}
              />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setStep('idle'); setCode(''); }}>Annuler</Button>
                <Button onClick={confirmEnable} disabled={code.length !== 6 || loading}>
                  Confirmer l&apos;activation
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'idle' && !enabled && (
            <motion.div key="idle-off">
              <Button variant="outline" onClick={startSetup} disabled={loading}>
                <Shield className="w-4 h-4" /> Activer 2FA — TOTP
              </Button>
            </motion.div>
          )}

          {step === 'idle' && enabled && (
            <motion.div key="idle-on" className="space-y-3">
              <p className="text-sm text-cream/50">Pour désactiver, entrez un code valide :</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full h-11 text-center text-xl tracking-[0.4em] font-mono rounded-xl bg-carbon-800 border border-carbon-600 focus:outline-none focus:border-red-500/50"
                maxLength={6}
              />
              <Button variant="destructive" onClick={handleDisable} disabled={code.length !== 6 || loading}>
                <ShieldOff className="w-4 h-4" /> Désactiver 2FA
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Card>
  );
}
