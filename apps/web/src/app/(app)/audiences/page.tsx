'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Plus, Filter, Clock, LayoutGrid, Table2, Navigation, BellRing } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewAudienceModal } from '@/components/audiences/new-audience-modal';
import {
  AudienceKanbanView,
  AudienceTableView,
  AUDIENCE_LIST_VIEW_STORAGE_KEY,
  type AudienceListViewMode,
} from '@/components/audiences/audience-list-views';
import { useAudiencesStore } from '@/stores/audiences-store';
import { useAuthStore, canCreateAudience, canFilterAudiencesByPriority, canAccompanyAudience, isWaitingRoomRole } from '@/stores/auth-store';
import { PRIORITY_LABELS, STATUS_LABELS, ROLE_LABELS, type UserRole } from '@/types';
import {
  completeAccompanimentApi,
  listAccompanimentPendingApi,
  type AccompanimentPendingApiRecord,
} from '@/lib/api-client';
import { notifyAudienceSync, subscribeAudienceSync } from '@/lib/audience-sync-bus';
import { isCemgPilotageAudience } from '@/lib/audience-utils';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function readStoredViewMode(): AudienceListViewMode {
  if (typeof window === 'undefined') return 'table';
  const stored = window.localStorage.getItem(AUDIENCE_LIST_VIEW_STORAGE_KEY);
  return stored === 'kanban' || stored === 'table' ? stored : 'table';
}

export default function AudiencesPage() {
  const audiences = useAudiencesStore((s) => s.audiences);
  const waitingRoomToday = useAudiencesStore((s) => s.waitingRoomToday);
  const isSyncing = useAudiencesStore((s) => s.isSyncing);
  const { user, permissions, accessToken } = useAuthStore();
  const canCreate = canCreateAudience(user?.role, permissions);
  const canAccompany = canAccompanyAudience(user?.role, permissions);
  const isWaitingRoom = isWaitingRoomRole(user?.role);
  const canFilterByPriority = canFilterAudiencesByPriority(user?.role);
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<AudienceListViewMode>('table');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [accompanimentPending, setAccompanimentPending] = useState<AccompanimentPendingApiRecord[]>([]);
  const [loadingAccompaniment, setLoadingAccompaniment] = useState(false);
  const [accompanyingId, setAccompanyingId] = useState<string | null>(null);
  const [accompanimentError, setAccompanimentError] = useState('');

  const loadAccompanimentPending = useCallback(async (silent = false) => {
    if (!accessToken || !canAccompany) return;
    if (!silent) setLoadingAccompaniment(true);
    try {
      const list = await listAccompanimentPendingApi(accessToken);
      setAccompanimentPending(list);
      setAccompanimentError('');
    } catch (err) {
      if (!silent) {
        setAccompanimentError(err instanceof Error ? err.message : 'Impossible de charger les audiences validées');
      }
    } finally {
      if (!silent) setLoadingAccompaniment(false);
    }
  }, [accessToken, canAccompany]);

  useEffect(() => {
    if (!isWaitingRoom || !canAccompany || !accessToken) return;
    void loadAccompanimentPending();
  }, [isWaitingRoom, canAccompany, accessToken, loadAccompanimentPending]);

  useEffect(() => {
    if (!isWaitingRoom || !canAccompany || !accessToken) return;
    const interval = setInterval(() => {
      void loadAccompanimentPending(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isWaitingRoom, canAccompany, accessToken, loadAccompanimentPending]);

  useEffect(() => {
    if (!canAccompany || !accessToken) return;
    return subscribeAudienceSync((event) => {
      if (event.type === 'reception-completed' && event.audienceId) {
        setAccompanimentPending((prev) => prev.filter((a) => a.id !== event.audienceId));
      }
      if (
        event.type === 'confirmed' ||
        event.type === 'reception-completed' ||
        event.type === 'accompaniment-completed'
      ) {
        void loadAccompanimentPending(true);
      }
    });
  }, [canAccompany, accessToken, loadAccompanimentPending]);

  const handleCompleteAccompaniment = async (audienceId: string) => {
    if (!accessToken) return;

    setAccompanimentError('');
    setAccompanyingId(audienceId);
    try {
      await completeAccompanimentApi(accessToken, audienceId);
      setAccompanimentPending((prev) => prev.filter((a) => a.id !== audienceId));
      notifyAudienceSync({ type: 'accompaniment-completed', audienceId });
    } catch (err) {
      setAccompanimentError(
        err instanceof Error ? err.message : 'Impossible de confirmer l\'accompagnement.',
      );
      void loadAccompanimentPending(true);
    } finally {
      setAccompanyingId(null);
    }
  };

  const formatBureau = (aud: AccompanimentPendingApiRecord) => {
    const person = aud.visitTarget
      ? `${aud.visitTarget.firstName} ${aud.visitTarget.lastName}`
      : 'Bureau non renseigné';
    const role = aud.visitTarget?.role
      ? ROLE_LABELS[aud.visitTarget.role as UserRole] ?? aud.visitTarget.role
      : null;
    const room = aud.room
      ? `${aud.room.name}${aud.room.floor ? ` · ${aud.room.floor}` : ''}`
      : null;
    return { person, role, room };
  };

  useEffect(() => {
    setViewMode(readStoredViewMode());
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === '1' && canCreate) setModalOpen(true);
  }, [searchParams, canCreate]);

  const filtered = useMemo(() => {
    const source =
      user?.role === 'CEMG'
        ? audiences.filter((a) => isCemgPilotageAudience(a, user.role))
        : audiences;

    const list = source.filter((a) => {
      const matchSearch =
        !search ||
        a.reference.toLowerCase().includes(search.toLowerCase()) ||
        a.subject.toLowerCase().includes(search.toLowerCase()) ||
        a.requesterName.toLowerCase().includes(search.toLowerCase()) ||
        (a.visitTarget &&
          `${a.visitTarget.firstName} ${a.visitTarget.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
      const matchPriority = !canFilterByPriority || priorityFilter === 'ALL' || a.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });

    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [audiences, search, statusFilter, priorityFilter, canFilterByPriority, user?.role]);

  useEffect(() => {
    setTablePage(1);
  }, [search, statusFilter, priorityFilter, viewMode, tablePageSize]);

  const handleViewModeChange = (mode: AudienceListViewMode) => {
    setViewMode(mode);
    window.localStorage.setItem(AUDIENCE_LIST_VIEW_STORAGE_KEY, mode);
  };

  return (
    <AuthGuard>
      <NewAudienceModal open={modalOpen} onOpenChange={setModalOpen} />

      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {isWaitingRoom ? 'Enregistrement des audiences' : 'Gestion des audiences'}
            </h1>
            <p className="text-cream/50 text-sm mt-1">
              {isWaitingRoom
                ? `${waitingRoomToday.length} enregistrement(s) aujourd'hui`
                : `${filtered.length} demande(s)`}
            </p>
          </div>
          {canCreate ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" /> Nouvelle audience
            </Button>
          ) : null}
        </div>

        {isWaitingRoom ? (
          <>
            {canAccompany ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-gold-400" />
                    <h2 className="text-lg font-semibold">Audiences validées — à accompagner</h2>
                  </div>
                  <p className="text-xs text-cream/40">
                    {loadingAccompaniment ? '…' : `${accompanimentPending.length} en attente d'accompagnement`}
                  </p>
                </div>
                <Card className="!p-4 border-gold-500/20 bg-gold-500/5">
                  <p className="text-sm text-cream/70 mb-4">
                    Dès qu&apos;une audience est confirmée par le Protocol, elle apparaît ici. Accompagnez le demandeur
                    jusqu&apos;au bureau de la personne à voir, puis confirmez l&apos;accompagnement.
                  </p>
                  {accompanimentError ? (
                    <p className="text-sm text-red-400 mb-3 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2">
                      {accompanimentError}
                    </p>
                  ) : null}
                  {loadingAccompaniment && accompanimentPending.length === 0 ? (
                    <p className="text-sm text-cream/40 text-center py-6">Chargement…</p>
                  ) : accompanimentPending.length === 0 ? (
                    <p className="text-sm text-cream/40 text-center py-6">
                      Aucune audience confirmée par le Protocol en attente pour le moment.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {accompanimentPending.map((aud) => {
                        const bureau = formatBureau(aud);
                        return (
                          <Card
                            key={aud.id}
                            className="!p-4 border-military-600/40 bg-military-950/30 ring-1 ring-gold-500/10"
                          >
                            <div className="flex flex-wrap items-start gap-4">
                              <div className="font-mono text-sm text-gold-400 w-36 shrink-0">{aud.reference}</div>
                              <div className="flex-1 min-w-[200px]">
                                <p className="font-semibold text-cream">{aud.requesterName}</p>
                                <p className="text-xs text-cream/45 mt-0.5 line-clamp-1">{aud.subject}</p>
                                <div className="mt-2 flex items-start gap-2 text-sm text-military-300">
                                  <Navigation className="w-4 h-4 shrink-0 mt-0.5 text-gold-400" />
                                  <div>
                                    <p className="font-medium">{bureau.person}</p>
                                    {bureau.role ? (
                                      <p className="text-[11px] text-cream/40">{bureau.role}</p>
                                    ) : null}
                                    {bureau.room ? (
                                      <p className="text-[11px] text-cream/35">Salle : {bureau.room}</p>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              {aud.priority === 'PRIORITE_0' || aud.priority === 'CRITIQUE' ? (
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-amber-600/40 text-amber-300 shrink-0">
                                  {PRIORITY_LABELS[aud.priority as keyof typeof PRIORITY_LABELS]}
                                </span>
                              ) : null}
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className="text-[10px] text-cream/35">
                                  Confirmée à {formatTime(aud.validatedAt)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="gold"
                                  disabled={accompanyingId === aud.id}
                                  onClick={() => void handleCompleteAccompaniment(aud.id)}
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  {accompanyingId === aud.id ? '…' : 'Accompagné au bureau'}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            ) : null}

            <Card className="!p-4 border-military-800/40 bg-military-950/20">
              <p className="text-sm text-cream/60">
                Vos enregistrements du jour apparaissent ci-dessous. Les audiences validées sont signalées
                en haut de page pour accompagnement au bureau concerné.
              </p>
            </Card>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Enregistrements du jour</h2>
              {isSyncing && waitingRoomToday.length === 0 ? (
                <Card className="text-center py-12 text-cream/40">Chargement…</Card>
              ) : waitingRoomToday.length === 0 ? (
                <Card className="text-center py-12 text-cream/40">
                  Aucun enregistrement aujourd&apos;hui.{' '}
                  <button type="button" onClick={() => setModalOpen(true)} className="text-military-400 hover:underline cursor-pointer">
                    Enregistrer une demande
                  </button>
                </Card>
              ) : (
                waitingRoomToday.map((aud, i) => (
                  <motion.div
                    key={aud.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="!p-4 border-carbon-700/50">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="font-mono text-sm text-military-400 w-36 shrink-0">{aud.reference}</div>
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-medium">{aud.subject}</p>
                          <p className="text-xs text-cream/40">{aud.requesterName}</p>
                        </div>
                        {aud.priority === 'PRIORITE_0' ? (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-carbon-600/50 text-cream/50 shrink-0">
                            {PRIORITY_LABELS.PRIORITE_0}
                          </span>
                        ) : null}
                        <div className="flex items-center gap-1.5 text-xs text-cream/40 shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(aud.createdAt)}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <Card className="!p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher par référence, objet, demandeur..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-cream/40" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filtrer par statut"
                    className="h-10 px-3 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"
                  >
                    <option value="ALL">Tous les statuts</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  {canFilterByPriority ? (
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      aria-label="Filtrer par priorité"
                      className="h-10 px-3 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"
                    >
                      <option value="ALL">Toutes les priorités</option>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  ) : null}
                </div>

                <div className="flex items-center rounded-xl border border-carbon-600 overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewModeChange('table')}
                    className={`flex items-center gap-1.5 h-10 px-3 text-xs transition-colors cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-military-900/50 text-gold-400'
                        : 'bg-carbon-800 text-cream/50 hover:text-cream'
                    }`}
                    aria-pressed={viewMode === 'table' ? 'true' : 'false'}
                  >
                    <Table2 className="w-4 h-4" />
                    Tableau
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange('kanban')}
                    className={`flex items-center gap-1.5 h-10 px-3 text-xs transition-colors cursor-pointer border-l border-carbon-600 ${
                      viewMode === 'kanban'
                        ? 'bg-military-900/50 text-gold-400'
                        : 'bg-carbon-800 text-cream/50 hover:text-cream'
                    }`}
                    aria-pressed={viewMode === 'kanban' ? 'true' : 'false'}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Kanban
                  </button>
                </div>
              </div>
            </Card>

            {filtered.length === 0 ? (
              <Card className="text-center py-12 text-cream/40">
                Aucune audience trouvée.{' '}
                <button type="button" onClick={() => setModalOpen(true)} className="text-military-400 hover:underline cursor-pointer">
                  Créer une demande
                </button>
              </Card>
            ) : viewMode === 'kanban' ? (
              <AudienceKanbanView audiences={filtered} />
            ) : (
              <AudienceTableView
                audiences={filtered}
                page={tablePage}
                pageSize={tablePageSize}
                onPageChange={setTablePage}
                onPageSizeChange={setTablePageSize}
              />
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}
