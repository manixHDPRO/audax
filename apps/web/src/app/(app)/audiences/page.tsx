'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Plus, Filter, LayoutGrid, Table2 } from 'lucide-react';
import { WaitingRoomView } from '@/components/monitoring/waiting-room-view';
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
import { useAuthStore, canCreateAudience, canFilterAudiencesByPriority, canAccompanyAudience, canCompleteAudience, isWaitingRoomRole } from '@/stores/auth-store';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/types';
import {
  completeAccompanimentApi,
  completeReceptionApi,
  confirmRequesterPresenceApi,
  listAccompanimentPendingApi,
  listBureausApi,
  listCabinetsApi,
  listPresencePendingApi,
  listReceptionsPendingApi,
  type AccompanimentPendingApiRecord,
  type OrgUnit,
  type PresencePendingApiRecord,
  type ReceptionPendingApiRecord,
} from '@/lib/api-client';
import { notifyAudienceSync, subscribeAudienceSync, buildRequesterPresenceAlertSync } from '@/lib/audience-sync-bus';
import { filterAudiencesByOrgUnit, isCemgPilotageAudience, isPriorite0HiddenFromChef } from '@/lib/audience-utils';

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
  const canCompleteReception = canCompleteAudience(user?.role, permissions);
  const isWaitingRoom = isWaitingRoomRole(user?.role);
  const isAdmin = user?.role === 'ADMIN';
  const canFilterByPriority = canFilterAudiencesByPriority(user?.role);
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [cabinetFilter, setCabinetFilter] = useState<string>('ALL');
  const [bureauFilter, setBureauFilter] = useState<string>('ALL');
  const [cabinets, setCabinets] = useState<OrgUnit[]>([]);
  const [bureaus, setBureaus] = useState<OrgUnit[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<AudienceListViewMode>('table');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [accompanimentPending, setAccompanimentPending] = useState<AccompanimentPendingApiRecord[]>([]);
  const [loadingAccompaniment, setLoadingAccompaniment] = useState(false);
  const [accompanyingId, setAccompanyingId] = useState<string | null>(null);
  const [accompanimentError, setAccompanimentError] = useState('');
  const [receptionsPending, setReceptionsPending] = useState<ReceptionPendingApiRecord[]>([]);
  const [loadingReceptions, setLoadingReceptions] = useState(false);
  const [completingReceptionId, setCompletingReceptionId] = useState<string | null>(null);
  const [receptionError, setReceptionError] = useState('');
  const [presencePending, setPresencePending] = useState<PresencePendingApiRecord[]>([]);
  const [loadingPresence, setLoadingPresence] = useState(false);
  const [confirmingPresenceId, setConfirmingPresenceId] = useState<string | null>(null);
  const [presenceError, setPresenceError] = useState('');

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

  const loadReceptionsPending = useCallback(async (silent = false) => {
    if (!accessToken || !canCompleteReception || !isWaitingRoom) return;
    if (!silent) setLoadingReceptions(true);
    try {
      const list = await listReceptionsPendingApi(accessToken);
      setReceptionsPending(list);
      setReceptionError('');
    } catch (err) {
      if (!silent) {
        setReceptionError(err instanceof Error ? err.message : 'Impossible de charger les réceptions en attente');
      }
    } finally {
      if (!silent) setLoadingReceptions(false);
    }
  }, [accessToken, canCompleteReception, isWaitingRoom]);

  const loadPresencePending = useCallback(async (silent = false) => {
    if (!accessToken || !canAccompany) return;
    if (!silent) setLoadingPresence(true);
    try {
      const list = await listPresencePendingApi(accessToken);
      setPresencePending(list);
      setPresenceError('');
    } catch (err) {
      if (!silent) {
        setPresenceError(err instanceof Error ? err.message : 'Impossible de charger les présences à confirmer');
      }
    } finally {
      if (!silent) setLoadingPresence(false);
    }
  }, [accessToken, canAccompany]);

  useEffect(() => {
    if (!isWaitingRoom || !canAccompany || !accessToken) return;
    void loadAccompanimentPending();
  }, [isWaitingRoom, canAccompany, accessToken, loadAccompanimentPending]);

  useEffect(() => {
    if (!isWaitingRoom || !canAccompany || !accessToken) return;
    void loadPresencePending();
  }, [isWaitingRoom, canAccompany, accessToken, loadPresencePending]);

  useEffect(() => {
    if (!isWaitingRoom || !canCompleteReception || !accessToken) return;
    void loadReceptionsPending();
  }, [isWaitingRoom, canCompleteReception, accessToken, loadReceptionsPending]);

  useEffect(() => {
    if (!isWaitingRoom || !canAccompany || !accessToken) return;
    const interval = setInterval(() => {
      void loadAccompanimentPending(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isWaitingRoom, canAccompany, accessToken, loadAccompanimentPending]);

  useEffect(() => {
    if (!isWaitingRoom || !canAccompany || !accessToken) return;
    const interval = setInterval(() => {
      void loadPresencePending(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isWaitingRoom, canAccompany, accessToken, loadPresencePending]);

  useEffect(() => {
    if (!isWaitingRoom || !canCompleteReception || !accessToken) return;
    const interval = setInterval(() => {
      void loadReceptionsPending(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isWaitingRoom, canCompleteReception, accessToken, loadReceptionsPending]);

  useEffect(() => {
    if (!accessToken) return;
    return subscribeAudienceSync((event) => {
      if (event.type === 'reception-completed' && event.audienceId) {
        setAccompanimentPending((prev) => prev.filter((a) => a.id !== event.audienceId));
        setReceptionsPending((prev) => prev.filter((a) => a.id !== event.audienceId));
      }
      if (
        event.type === 'confirmed' ||
        event.type === 'reception-completed' ||
        event.type === 'accompaniment-completed' ||
        event.type === 'presence-confirmed'
      ) {
        if (canAccompany) {
          void loadAccompanimentPending(true);
          void loadPresencePending(true);
        }
        if (isWaitingRoom && canCompleteReception) void loadReceptionsPending(true);
      }
    });
  }, [
    accessToken,
    canAccompany,
    canCompleteReception,
    isWaitingRoom,
    loadAccompanimentPending,
    loadPresencePending,
    loadReceptionsPending,
  ]);

  const handleCompleteAccompaniment = async (audienceId: string) => {
    if (!accessToken) return;

    setAccompanimentError('');
    setAccompanyingId(audienceId);
    try {
      await completeAccompanimentApi(accessToken, audienceId);
      setAccompanimentPending((prev) => prev.filter((a) => a.id !== audienceId));
      notifyAudienceSync({ type: 'accompaniment-completed', audienceId });
      void loadReceptionsPending(true);
    } catch (err) {
      setAccompanimentError(
        err instanceof Error ? err.message : 'Impossible de confirmer l\'accompagnement.',
      );
      void loadAccompanimentPending(true);
    } finally {
      setAccompanyingId(null);
    }
  };

  const handleConfirmPresence = async (audienceId: string) => {
    if (!accessToken) return;

    setPresenceError('');
    setConfirmingPresenceId(audienceId);
    try {
      await confirmRequesterPresenceApi(accessToken, audienceId);
      setPresencePending((prev) => prev.filter((a) => a.id !== audienceId));
      notifyAudienceSync({
        type: 'presence-confirmed',
        audienceId,
        ...buildRequesterPresenceAlertSync(),
      });
    } catch (err) {
      setPresenceError(
        err instanceof Error ? err.message : 'Impossible de confirmer la présence.',
      );
      void loadPresencePending(true);
    } finally {
      setConfirmingPresenceId(null);
    }
  };

  const handleCompleteReception = async (audienceId: string) => {
    if (!accessToken) return;

    setReceptionError('');
    setCompletingReceptionId(audienceId);
    try {
      await completeReceptionApi(accessToken, audienceId);
      setReceptionsPending((prev) => prev.filter((a) => a.id !== audienceId));
      notifyAudienceSync({ type: 'reception-completed', audienceId });
    } catch (err) {
      setReceptionError(
        err instanceof Error ? err.message : 'Impossible de confirmer la réception.',
      );
      void loadReceptionsPending(true);
    } finally {
      setCompletingReceptionId(null);
    }
  };

  useEffect(() => {
    setViewMode(readStoredViewMode());
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === '1' && canCreate) setModalOpen(true);
  }, [searchParams, canCreate]);

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    void Promise.all([listCabinetsApi(accessToken), listBureausApi(accessToken)])
      .then(([cabinetList, bureauList]) => {
        setCabinets(cabinetList);
        setBureaus(bureauList);
      })
      .catch(() => {
        setCabinets([]);
        setBureaus([]);
      });
  }, [isAdmin, accessToken]);

  const filtered = useMemo(() => {
    const source =
      user?.role === 'CEMG'
        ? audiences.filter((a) => isCemgPilotageAudience(a, user.role))
        : user?.role === 'CHEF'
          ? audiences.filter((a) => !isPriorite0HiddenFromChef(a, 'CHEF'))
        : isAdmin
          ? filterAudiencesByOrgUnit(audiences, {
              cabinetId: cabinetFilter === 'ALL' ? undefined : cabinetFilter,
              bureauId: bureauFilter === 'ALL' ? undefined : bureauFilter,
            })
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
  }, [audiences, search, statusFilter, priorityFilter, canFilterByPriority, user?.role, isAdmin, cabinetFilter, bureauFilter]);

  useEffect(() => {
    setTablePage(1);
  }, [search, statusFilter, priorityFilter, cabinetFilter, bureauFilter, viewMode, tablePageSize]);

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
              {isWaitingRoom
                ? "Salle d'attente & Enregistrement des audiences"
                : isAdmin
                  ? 'Vue d\'ensemble des audiences'
                  : 'Gestion des audiences'}
            </h1>
            <p className="text-cream/50 text-sm mt-1">
              {isWaitingRoom
                ? `${waitingRoomToday.length} enregistrement(s) aujourd'hui`
                : isAdmin
                  ? `${filtered.length} audience(s) affichée(s) sur ${audiences.length} au total — ${filtered.filter((a) => !['TERMINEE', 'REJETEE', 'ARCHIVEE'].includes(a.status)).length} active(s)`
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
          <WaitingRoomView
            waitingRoomToday={waitingRoomToday}
            isSyncing={isSyncing}
            canCreate={canCreate}
            canAccompany={canAccompany}
            canCompleteReception={canCompleteReception}
            accompanimentPending={accompanimentPending}
            loadingAccompaniment={loadingAccompaniment}
            accompanimentError={accompanimentError}
            accompanyingId={accompanyingId}
            onCompleteAccompaniment={(id) => void handleCompleteAccompaniment(id)}
            presencePending={presencePending}
            loadingPresence={loadingPresence}
            presenceError={presenceError}
            confirmingPresenceId={confirmingPresenceId}
            onConfirmPresence={(id) => void handleConfirmPresence(id)}
            receptionsPending={receptionsPending}
            loadingReceptions={loadingReceptions}
            receptionError={receptionError}
            completingReceptionId={completingReceptionId}
            onCompleteReception={(id) => void handleCompleteReception(id)}
            onNewAudience={() => setModalOpen(true)}
          />
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
                  {isAdmin ? (
                    <>
                      <select
                        value={cabinetFilter}
                        onChange={(e) => setCabinetFilter(e.target.value)}
                        aria-label="Filtrer par cabinet"
                        className="h-10 px-3 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"
                      >
                        <option value="ALL">Tous les cabinets</option>
                        {cabinets.map((cabinet) => (
                          <option key={cabinet.id} value={cabinet.id}>{cabinet.name}</option>
                        ))}
                      </select>
                      <select
                        value={bureauFilter}
                        onChange={(e) => setBureauFilter(e.target.value)}
                        aria-label="Filtrer par bureau"
                        className="h-10 px-3 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"
                      >
                        <option value="ALL">Tous les bureaux</option>
                        {bureaus.map((bureau) => (
                          <option key={bureau.id} value={bureau.id}>{bureau.name}</option>
                        ))}
                      </select>
                    </>
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
                showOrgColumn={isAdmin}
              />
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}
