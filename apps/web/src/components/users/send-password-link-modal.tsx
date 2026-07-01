'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

interface SendPasswordLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userEmail: string;
  onSubmit: () => Promise<void>;
}

export function SendPasswordLinkModal({
  open,
  onOpenChange,
  userName,
  userEmail,
  onSubmit,
}: SendPasswordLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSent(false);
      setError('');
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer un lien par e-mail</DialogTitle>
          <DialogDescription>
            {sent
              ? `Un lien a été envoyé à ${userEmail}.`
              : `Un lien sécurisé sera envoyé à ${userName} (${userEmail}) pour définir ou réinitialiser son mot de passe.`}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex justify-end pt-2">
            <Button onClick={() => handleOpenChange(false)}>Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-military-800/50 bg-carbon-900/40 p-4 flex items-start gap-3">
              <Mail className="w-5 h-5 text-military-400 shrink-0 mt-0.5" />
              <p className="text-sm text-cream/60">
                L&apos;utilisateur recevra un e-mail avec un lien valide 48 heures. Vous ne pourrez pas définir le mot de passe à sa place.
              </p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
