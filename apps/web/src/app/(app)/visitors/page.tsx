'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, QrCode, UserPlus } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RegisterVisitorModal } from '@/components/visitors/register-visitor-modal';
import { isApiConfigured, API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import { listVisitorsApi, type VisitorApiRecord } from '@/lib/api-client';
import { useAuthStore, canRegisterVisitor } from '@/stores/auth-store';

export default function VisitorsPage() {
  const { accessToken, permissions, user } = useAuthStore();
  const canCreate = canRegisterVisitor(user?.role, permissions);
  const [visitors, setVisitors] = useState<VisitorApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadVisitors = useCallback(async () => {
    if (!accessToken || !isApiConfigured()) {
      setLoading(false);
      setError(API_UNAVAILABLE_MESSAGE);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await listVisitorsApi(accessToken);
      setVisitors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : API_UNAVAILABLE_MESSAGE);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadVisitors();
  }, [loadVisitors]);

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestion des visiteurs</h1>
            <p className="text-sm text-cream/50 mt-1">
              {loading ? 'Chargement…' : `${visitors.length} visiteur${visitors.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setModalOpen(true)}>
              <UserPlus className="w-4 h-4" /> Nouveau visiteur
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-cream/40 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Chargement des visiteurs…
          </div>
        ) : visitors.length === 0 && !error ? (
          <Card className="py-16 text-center">
            <p className="text-cream/50">Aucun visiteur enregistré pour le moment.</p>
            {canCreate && (
              <Button className="mt-4" onClick={() => setModalOpen(true)}>
                <UserPlus className="w-4 h-4" /> Enregistrer le premier
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visitors.map((v) => (
              <Card key={v.id} className="hover:border-military-600/30 transition-colors">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-xl bg-military-800 flex items-center justify-center text-lg font-bold text-gold-400 shrink-0">
                    {(v.firstName?.[0] ?? '?')}
                    {(v.lastName?.[0] ?? '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      {v.firstName} {v.lastName}
                    </p>
                    <p className="text-xs text-cream/40">{v.organization || '—'}</p>
                    <p className="text-xs text-cream/30 mt-1">{v.function || ''}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-carbon-700 uppercase">
                        {v.accessLevel ?? 'STANDARD'}
                      </span>
                      {v.badgeCode && (
                        <span className="text-[10px] font-mono text-military-400 flex items-center gap-1">
                          <QrCode className="w-3 h-3" /> {v.badgeCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <RegisterVisitorModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onRegistered={() => void loadVisitors()}
        />
      </div>
    </AuthGuard>
  );
}
