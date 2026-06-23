'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, QrCode, Save, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import {
  createVisitorApi,
  searchVisitorsForRegistrationApi,
  type VisitorLookupResult,
} from '@/lib/api-client';

const inputClass =
  'mt-1 w-full h-9 px-3 rounded-lg bg-carbon-800 border border-carbon-600 text-sm text-cream focus:outline-none focus:border-military-500 focus:ring-1 focus:ring-military-500/30 transition-all';

const labelClass = 'text-[10px] uppercase tracking-wider text-cream/50';

interface RegisterVisitorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered?: () => void;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ') || firstName;
  return { firstName, lastName };
}

export function RegisterVisitorModal({ open, onOpenChange, onRegistered }: RegisterVisitorModalProps) {
  const { accessToken } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [functionValue, setFunctionValue] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ firstName: string; lastName: string; badgeCode?: string | null } | null>(null);
  const [searchResults, setSearchResults] = useState<VisitorLookupResult[] | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetForm = () => {
    setFullName('');
    setFunctionValue('');
    setOrganization('');
    setPhone('');
    setEmail('');
    setError('');
    setSuccess(null);
    setSearchResults(null);
    setShowSearchResults(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  useEffect(() => {
    if (!open || !accessToken || fullName.trim().length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      void searchVisitorsForRegistrationApi(accessToken, fullName.trim())
        .then((results) => {
          setSearchResults(results);
          setShowSearchResults(results.length > 0);
        })
        .catch(() => setSearchResults(null));
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [open, accessToken, fullName]);

  const applyExistingVisitor = (
    firstName: string,
    lastName: string,
    fonction?: string | null,
    org?: string | null,
  ) => {
    setFullName(`${firstName} ${lastName}`.trim());
    setFunctionValue(fonction ?? '');
    setOrganization(org ?? '');
    setShowSearchResults(false);
    setError('Ce visiteur possède déjà une fiche — modifiez le nom ou créez une audience pour lui.');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName || !lastName) {
      setError('Le nom complet est obligatoire');
      setLoading(false);
      return;
    }

    if (!accessToken) {
      setError('Session expirée — reconnectez-vous');
      setLoading(false);
      return;
    }

    try {
      const created = await createVisitorApi(accessToken, {
        firstName,
        lastName,
        function: functionValue.trim() || undefined,
        organization: organization.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setSuccess({
        firstName: created.firstName,
        lastName: created.lastName,
        badgeCode: created.badgeCode,
      });
      onRegistered?.();
      setLoading(false);
      setTimeout(() => handleOpenChange(false), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg p-5">
        <DialogHeader className="mb-3">
          <DialogTitle>Enregistrer un visiteur</DialogTitle>
          <DialogDescription>
            Fiche visiteur et badge d&apos;accueil — sans créer de demande d&apos;audience
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10"
          >
            <CheckCircle2 className="w-12 h-12 text-military-400 mx-auto mb-3" />
            <p className="text-military-400 font-semibold">Visiteur enregistré</p>
            <p className="text-sm text-cream mt-2">
              {success.firstName} {success.lastName}
            </p>
            {success.badgeCode ? (
              <p className="text-xs font-mono text-gold-400 mt-3 flex items-center justify-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                {success.badgeCode}
              </p>
            ) : null}
            <p className="text-xs text-cream/50 mt-4 max-w-xs mx-auto">
              Vous pourrez créer une audience pour ce visiteur plus tard via « Nouvelle audience ».
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <label className={labelClass} htmlFor="visitor-name">Nom complet *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream/30 pointer-events-none mt-0.5" />
                <input
                  id="visitor-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => {
                    if (searchResults?.length) {
                      setShowSearchResults(true);
                    }
                  }}
                  required
                  autoComplete="off"
                  placeholder="Rechercher ou saisir un nom"
                  className={`${inputClass} pl-9`}
                />
              </div>
              {showSearchResults && searchResults?.length ? (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-carbon-600 bg-carbon-900 shadow-xl max-h-48 overflow-y-auto">
                  {searchResults.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => applyExistingVisitor(v.firstName, v.lastName, v.function, v.organization)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-carbon-800 border-b border-carbon-700/50 last:border-0 cursor-pointer"
                    >
                      <span className="text-cream font-medium">{v.firstName} {v.lastName}</span>
                      {v.function ? <span className="text-cream/40 ml-2">— {v.function}</span> : null}
                      <span className="block text-[10px] text-military-400 mt-0.5">Fiche visiteur existante</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <label className={labelClass} htmlFor="visitor-function">Fonction</label>
              <input
                id="visitor-function"
                value={functionValue}
                onChange={(e) => setFunctionValue(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="visitor-org">Organisme</label>
              <input
                id="visitor-org"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="visitor-phone">Téléphone</label>
                <input
                  id="visitor-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="visitor-email">Email</label>
                <input
                  id="visitor-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {error ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/30 border border-red-800/30 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                <Save className="w-3.5 h-3.5" />
                {loading ? 'Enregistrement...' : 'Enregistrer le visiteur'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
