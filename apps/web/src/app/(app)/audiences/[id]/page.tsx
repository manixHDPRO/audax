'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Trash2, AlertCircle, CalendarClock, Send } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RescheduleAudienceModal } from '@/components/audiences/reschedule-audience-modal';
import { useAudiencesStore } from '@/stores/audiences-store';
import { formatDate } from '@/lib/utils';
import { normalizeAccompaniedPersons, describeStatusHistoryEntry, formatUserName, sortStatusHistoryNewestFirst } from '@/lib/audience-utils';
import { PRIORITY_LABELS, CONFIDENTIALITY_LABELS, type Audience, type AudienceStatus } from '@/types';
import { deleteAudienceApi, forwardToDircabApi, validateAudienceApi } from '@/lib/api-client';
import {
  useAuthStore,
  canDeleteAudience,
  canValidateAudience,
  canPlanifyAudience,
  isWaitingRoomRole,
} from '@/stores/auth-store';

const ACTIONABLE_STATUSES: AudienceStatus[] = ['EN_ATTENTE', 'EN_ANALYSE', 'VALIDEE', 'PLANIFIEE'];

export default function AudienceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const audience = useAudiencesStore((s) => s.audiences.find((a) => a.id === id));
  const fetchAudienceById = useAudiencesStore((s) => s.fetchAudienceById);
  const removeAudience = useAudiencesStore((s) => s.removeAudience);
  const { accessToken, user, permissions } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Audience | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [dircabDialogOpen, setDircabDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const canDelete = canDeleteAudience(user?.role, permissions);
  const canValidate = canValidateAudience(user?.role, permissions);
  const canPlanify = canPlanifyAudience(user?.role, permissions);

  useEffect(() => {
    if (isWaitingRoomRole(user?.role)) {
      router.replace('/audiences');
    }
  }, [user?.role, router]);

  useEffect(() => {
    setDetail(null);
  }, [id]);

  useEffect(() => {
    if (isWaitingRoomRole(user?.role)) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }
    void fetchAudienceById(accessToken, id, { force: true })
      .then((fresh) => {
        if (fresh) setDetail(fresh);
      })
      .finally(() => setLoading(false));
  }, [id, accessToken, fetchAudienceById, user?.role]);

  const displayAudience = detail ?? audience;

  if (isWaitingRoomRole(user?.role)) {
    return (
      <AuthGuard>
        <div className="p-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-military-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  const handleValidation = async (decision: 'APPROUVE' | 'REJETE') => {
    if (!accessToken || !displayAudience) return;

    setActionError('');
    setActionLoading(true);
    try {
      await validateAudienceApi(accessToken, displayAudience.id, { decision });
      const refreshed = await fetchAudienceById(accessToken, displayAudience.id, { force: true });
      if (refreshed) setDetail(refreshed);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForwardToDircab = async () => {
    if (!accessToken || !displayAudience) return;

    setActionError('');
    setActionLoading(true);
    try {
      await forwardToDircabApi(accessToken, displayAudience.id);
      const refreshed = await fetchAudienceById(accessToken, displayAudience.id, { force: true });
      if (refreshed) setDetail(refreshed);
      setDircabDialogOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Transmission impossible');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSuccess = async () => {
    if (accessToken) {
      const refreshed = await fetchAudienceById(accessToken, id, { force: true });
      if (refreshed) setDetail(refreshed);
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !displayAudience) return;

    setDeleteError('');
    setDeleting(true);
    try {
      await deleteAudienceApi(accessToken, displayAudience.id);
      removeAudience(displayAudience.id);
      setDeleteDialogOpen(false);
      router.push('/audiences');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Impossible de supprimer cette audience');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="p-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-military-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  if (!displayAudience) {
    return (
      <AuthGuard>
        <div className="p-8 text-center space-y-4">
          <p className="text-cream/50">Audience introuvable</p>
          <Link href="/audiences" className="text-military-400 hover:underline text-sm">Retour à la liste</Link>
        </div>
      </AuthGuard>
    );
  }

  const showActions = canValidate && ACTIONABLE_STATUSES.includes(displayAudience.status);
  const onlyRescheduleAllowed = displayAudience.status === 'VALIDEE' || displayAudience.status === 'PLANIFIEE';
  const historyEntries = sortStatusHistoryNewestFirst(displayAudience.statusHistory);

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Link href="/audiences" className="inline-flex items-center gap-2 text-sm text-cream/50 hover:text-cream">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-military-400">{displayAudience.reference}</p>
            <h1 className="text-2xl font-bold mt-1">{displayAudience.subject}</h1>
            <div className="flex gap-2 mt-3">
              <StatusBadge status={displayAudience.status} />
              <PriorityBadge priority={displayAudience.priority} />
            </div>
          </div>
          {showActions ? (
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap justify-end gap-2">
                {canPlanify ? (
                  <Button variant="outline" onClick={() => setRescheduleOpen(true)} disabled={actionLoading}>
                    <CalendarClock className="w-4 h-4" /> Réprogrammer
                  </Button>
                ) : null}
                {displayAudience.status === 'EN_ATTENTE' ? (
                  <Button
                    variant="outline"
                    onClick={() => { setActionError(''); setDircabDialogOpen(true); }}
                    disabled={actionLoading}
                  >
                    <Send className="w-4 h-4" /> Envoyer chez le Dircab
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => void handleValidation('APPROUVE')}
                  disabled={onlyRescheduleAllowed || actionLoading}
                >
                  <CheckCircle className="w-4 h-4" /> Valider
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleValidation('REJETE')}
                  disabled={onlyRescheduleAllowed || actionLoading}
                >
                  <XCircle className="w-4 h-4" /> Rejeter
                </Button>
              </div>
              {actionError ? <p className="text-sm text-red-400 text-right">{actionError}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="grid md:grid-cols-1 gap-6 max-w-xl">
          <Card>
            <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-cream/40">Catégorie</dt><dd>{displayAudience.category}</dd></div>
              {displayAudience.grade && (
                <div><dt className="text-cream/40">Grade</dt><dd>{displayAudience.grade}</dd></div>
              )}
              {displayAudience.visitMode && (
                <div><dt className="text-cream/40">Type de visite</dt><dd>{displayAudience.visitMode === 'ACCOMPAGNE' ? 'Accompagné' : 'Individuel'}</dd></div>
              )}
              {displayAudience.accompaniedPersons && displayAudience.accompaniedPersons.length > 0 && (
                <div>
                  <dt className="text-cream/40">Personnes accompagnantes</dt>
                  <dd>
                    <ul className="mt-1 space-y-1">
                      {normalizeAccompaniedPersons(displayAudience.accompaniedPersons).map((person, i) => (
                        <li key={`${person.name}-${i}`} className="flex items-center gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-military-500 shrink-0" />
                          {person.grade && (
                            <span className="text-military-400 text-xs">{person.grade}</span>
                          )}
                          {person.name}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              <div><dt className="text-cream/40">Personne à voir</dt><dd>{displayAudience.visitTarget ? `${displayAudience.visitTarget.firstName} ${displayAudience.visitTarget.lastName}` : '—'}</dd></div>
              <div><dt className="text-cream/40">Nom</dt><dd>{displayAudience.requesterName}</dd></div>
              <div><dt className="text-cream/40">Fonction</dt><dd>{displayAudience.visitorFunction ?? displayAudience.requesterOrg ?? '—'}</dd></div>
              <div><dt className="text-cream/40">Objet</dt><dd>{displayAudience.subject}</dd></div>
              <div><dt className="text-cream/40">Priorité</dt><dd>{PRIORITY_LABELS[displayAudience.priority]}</dd></div>
              <div><dt className="text-cream/40">Confidentialité</dt><dd>{CONFIDENTIALITY_LABELS[displayAudience.confidentiality]}</dd></div>
              <div><dt className="text-cream/40">Créée le</dt><dd>{formatDate(displayAudience.createdAt)}</dd></div>
              {displayAudience.scheduledAt && (
                <div><dt className="text-cream/40">Planifiée le</dt><dd>{formatDate(displayAudience.scheduledAt)}</dd></div>
              )}
            </dl>
          </Card>
        </div>

        {displayAudience.visitors?.length ? (
          <Card>
            <CardHeader><CardTitle>Visiteur(s)</CardTitle></CardHeader>
            {displayAudience.visitors.map(({ visitor }) => (
              <div key={visitor.id} className="p-3 rounded-xl bg-carbon-800/50 mb-2">
                <p className="font-medium">{visitor.firstName} {visitor.lastName}</p>
                <p className="text-xs text-cream/40">{visitor.organization}</p>
              </div>
            ))}
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle>Historique de validation</CardTitle></CardHeader>
          {historyEntries.length ? (
            <div className="space-y-4 pl-4 border-l border-military-700/30">
              {historyEntries.map((entry, index) => {
                const { title, detail: entryDetail } = describeStatusHistoryEntry(entry);
                const actor = formatUserName(entry.changedByUser);
                const isLatest = index === 0;
                return (
                  <div
                    key={entry.id}
                    className={`text-sm relative rounded-lg pr-3 py-2 -ml-1 ${
                      isLatest ? 'bg-military-900/25 border border-military-700/40' : ''
                    }`}
                  >
                    <span
                      className={`absolute -left-[1.22rem] top-3 rounded-full ${
                        isLatest ? 'w-2.5 h-2.5 bg-military-400 ring-2 ring-military-600/50' : 'w-2 h-2 bg-military-500'
                      }`}
                    />
                    {isLatest ? (
                      <p className="text-[10px] uppercase tracking-wider text-military-400 mb-1">
                        Dernier enregistrement
                      </p>
                    ) : null}
                    <p className="text-cream/40 text-xs">{formatDate(entry.createdAt)}</p>
                    <p className="font-medium">{title}</p>
                    {entryDetail ? <p className="text-cream/70">{entryDetail}</p> : null}
                    {actor ? <p className="text-cream/40 text-xs mt-1">Par {actor}</p> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-cream/50">Aucun historique disponible.</p>
          )}
        </Card>

        {canDelete && (
          <Card className="border-red-900/40">
            <CardHeader><CardTitle className="text-red-400">Zone administrateur</CardTitle></CardHeader>
            <p className="text-sm text-cream/50 mb-4">
              Suppression définitive de la demande et de son historique associé.
            </p>
            {deleteError && (
              <p className="text-sm text-red-400 mb-3">{deleteError}</p>
            )}
            <Button variant="destructive" onClick={() => { setDeleteError(''); setDeleteDialogOpen(true); }}>
              <Trash2 className="w-4 h-4" />
              Supprimer cette audience
            </Button>
          </Card>
        )}

        {canPlanify ? (
          <RescheduleAudienceModal
            open={rescheduleOpen}
            onOpenChange={setRescheduleOpen}
            audience={displayAudience}
            accessToken={accessToken ?? ''}
            onSuccess={handleRescheduleSuccess}
          />
        ) : null}

        <ConfirmDialog
          open={dircabDialogOpen}
          onOpenChange={setDircabDialogOpen}
          title="Envoyer chez le Dircab ?"
          description="La demande sera transmise au Chef de cabinet pour analyse et décision."
          confirmLabel="Transmettre au Dircab"
          cancelLabel="Annuler"
          loading={actionLoading}
          loadingLabel="Transmission…"
          variant="default"
          onConfirm={() => void handleForwardToDircab()}
        />

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Supprimer cette audience ?"
          description="Cette action est irréversible. La demande et son historique seront définitivement effacés."
          confirmLabel="Supprimer définitivement"
          cancelLabel="Annuler"
          loading={deleting}
          loadingLabel="Suppression…"
          onConfirm={() => void handleDelete()}
        >
          {deleteError && (
            <p className="text-sm text-red-400 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2">
              {deleteError}
            </p>
          )}
          <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-4 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-cream/40">Référence</p>
              <p className="font-mono text-sm text-red-300 mt-0.5">{displayAudience.reference}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-cream/40">Objet</p>
              <p className="text-sm text-cream mt-0.5">{displayAudience.subject}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-cream/40">Demandeur</p>
              <p className="text-sm text-cream/80 mt-0.5">{displayAudience.requesterName}</p>
            </div>
            <div className="flex items-start gap-2 pt-1 text-xs text-red-300/80">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Aucune restauration possible après validation.</span>
            </div>
          </div>
        </ConfirmDialog>
      </div>
    </AuthGuard>
  );
}
