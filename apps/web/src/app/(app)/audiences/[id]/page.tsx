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
import { normalizeAccompaniedPersons } from '@/lib/audience-utils';
import { PRIORITY_LABELS, CONFIDENTIALITY_LABELS, type Audience, type AudienceStatus } from '@/types';
import { deleteAudienceApi, forwardToDircabApi, validateAudienceApi } from '@/lib/api-client';
import { mapApiAudience } from '@/lib/audience-utils';
import {
  useAuthStore,
  canDeleteAudience,
  canValidateAudience,
  canPlanifyAudience,
  isWaitingRoomRole,
} from '@/stores/auth-store';

const ACTIONABLE_STATUSES: AudienceStatus[] = ['EN_ATTENTE', 'EN_ANALYSE', 'VALIDEE', 'PLANIFIEE'];

function statusAfterValidation(decision: 'APPROUVE' | 'REJETE'): AudienceStatus {
  if (decision === 'APPROUVE') return 'VALIDEE';
  return 'REJETEE';
}

export default function AudienceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const audience = useAudiencesStore((s) => s.getById(id));
  const fetchAudienceById = useAudiencesStore((s) => s.fetchAudienceById);
  const removeAudience = useAudiencesStore((s) => s.removeAudience);
  const upsertAudience = useAudiencesStore((s) => s.upsertAudience);
  const isSyncing = useAudiencesStore((s) => s.isSyncing);
  const { accessToken, user, permissions } = useAuthStore();
  const [loading, setLoading] = useState(true);
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
    if (isWaitingRoomRole(user?.role)) return;
    if (audience) {
      setLoading(false);
      return;
    }
    if (!accessToken) {
      setLoading(false);
      return;
    }
    void fetchAudienceById(accessToken, id).finally(() => setLoading(false));
  }, [id, audience, accessToken, fetchAudienceById, user?.role]);

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
    if (!accessToken || !audience) return;

    setActionError('');
    setActionLoading(true);
    try {
      await validateAudienceApi(accessToken, audience.id, { decision });
      upsertAudience({ ...audience, status: statusAfterValidation(decision) });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForwardToDircab = async () => {
    if (!accessToken || !audience) return;

    setActionError('');
    setActionLoading(true);
    try {
      const updated = await forwardToDircabApi(accessToken, audience.id);
      upsertAudience(mapApiAudience(updated));
      setDircabDialogOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Transmission impossible');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSuccess = (updated: Audience) => {
    if (audience) upsertAudience({ ...audience, ...updated });
  };

  const handleDelete = async () => {
    if (!accessToken || !audience) return;

    setDeleteError('');
    setDeleting(true);
    try {
      await deleteAudienceApi(accessToken, audience.id);
      removeAudience(audience.id);
      setDeleteDialogOpen(false);
      router.push('/audiences');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Impossible de supprimer cette audience');
      setDeleting(false);
    }
  };

  if (loading || isSyncing) {
    return (
      <AuthGuard>
        <div className="p-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-military-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  if (!audience) {
    return (
      <AuthGuard>
        <div className="p-8 text-center space-y-4">
          <p className="text-cream/50">Audience introuvable</p>
          <Link href="/audiences" className="text-military-400 hover:underline text-sm">Retour à la liste</Link>
        </div>
      </AuthGuard>
    );
  }

  const showActions = canValidate && ACTIONABLE_STATUSES.includes(audience.status);
  const onlyRescheduleAllowed = audience.status === 'VALIDEE' || audience.status === 'PLANIFIEE';

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Link href="/audiences" className="inline-flex items-center gap-2 text-sm text-cream/50 hover:text-cream">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-military-400">{audience.reference}</p>
            <h1 className="text-2xl font-bold mt-1">{audience.subject}</h1>
            <div className="flex gap-2 mt-3">
              <StatusBadge status={audience.status} />
              <PriorityBadge priority={audience.priority} />
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
                {audience.status === 'EN_ATTENTE' ? (
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
              <div><dt className="text-cream/40">Catégorie</dt><dd>{audience.category}</dd></div>
              {audience.grade && (
                <div><dt className="text-cream/40">Grade</dt><dd>{audience.grade}</dd></div>
              )}
              {audience.visitMode && (
                <div><dt className="text-cream/40">Type de visite</dt><dd>{audience.visitMode === 'ACCOMPAGNE' ? 'Accompagné' : 'Individuel'}</dd></div>
              )}
              {audience.accompaniedPersons && audience.accompaniedPersons.length > 0 && (
                <div>
                  <dt className="text-cream/40">Personnes accompagnantes</dt>
                  <dd>
                    <ul className="mt-1 space-y-1">
                      {normalizeAccompaniedPersons(audience.accompaniedPersons).map((person, i) => (
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
              <div><dt className="text-cream/40">Nom</dt><dd>{audience.requesterName}</dd></div>
              <div><dt className="text-cream/40">Fonction</dt><dd>{audience.visitorFunction ?? audience.requesterOrg ?? '—'}</dd></div>
              <div><dt className="text-cream/40">Objet</dt><dd>{audience.subject}</dd></div>
              <div><dt className="text-cream/40">Priorité</dt><dd>{PRIORITY_LABELS[audience.priority]}</dd></div>
              <div><dt className="text-cream/40">Confidentialité</dt><dd>{CONFIDENTIALITY_LABELS[audience.confidentiality]}</dd></div>
              <div><dt className="text-cream/40">Créée le</dt><dd>{formatDate(audience.createdAt)}</dd></div>
              {audience.scheduledAt && (
                <div><dt className="text-cream/40">Planifiée le</dt><dd>{formatDate(audience.scheduledAt)}</dd></div>
              )}
            </dl>
          </Card>
        </div>

        {audience.visitors?.length ? (
          <Card>
            <CardHeader><CardTitle>Visiteur(s)</CardTitle></CardHeader>
            {audience.visitors.map(({ visitor }) => (
              <div key={visitor.id} className="p-3 rounded-xl bg-carbon-800/50 mb-2">
                <p className="font-medium">{visitor.firstName} {visitor.lastName}</p>
                <p className="text-xs text-cream/40">{visitor.organization}</p>
              </div>
            ))}
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle>Historique de validation</CardTitle></CardHeader>
          <div className="space-y-3 pl-4 border-l border-military-700/30">
            <div className="text-sm">
              <p className="text-cream/40 text-xs">Création</p>
              <p>Demande enregistrée — En attente</p>
            </div>
            {audience.status === 'DEJA_ENVOYE' && (
              <div className="text-sm">
                <p className="text-cream/40 text-xs">Dircab</p>
                <p>Transmise au Chef de cabinet — Déjà envoyé</p>
              </div>
            )}
            {audience.status !== 'EN_ATTENTE' && audience.status !== 'DEJA_ENVOYE' && (
              <div className="text-sm">
                <p className="text-cream/40 text-xs">Analyse</p>
                <p>Transmise au protocol</p>
              </div>
            )}
          </div>
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
            audience={audience}
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
              <p className="font-mono text-sm text-red-300 mt-0.5">{audience.reference}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-cream/40">Objet</p>
              <p className="text-sm text-cream mt-0.5">{audience.subject}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-cream/40">Demandeur</p>
              <p className="text-sm text-cream/80 mt-0.5">{audience.requesterName}</p>
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
