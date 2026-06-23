'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  UserCheck, 
  Clock, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Search,
  Send
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { useAudiencesStore } from '@/stores/audiences-store';
import { cn } from '@/lib/utils';
import { confirmAudienceApi, completeReceptionApi, forwardToDircabApi } from '@/lib/api-client';
import { notifyAudienceSync, buildForwardAlertSync, buildProtocolFollowUpAlertSync } from '@/lib/audience-sync-bus';
import {
  isProtocolCemgCabinetTracking,
  isProtocolCemgConfirmQueue,
  isProtocolCemgReceptionQueue,
  isCemgRelatedAudience,
} from '@/lib/audience-utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import Link from 'next/link';

export default function ProtocolTrackingPage() {
  const { accessToken } = useAuthStore();
  const audiences = useAudiencesStore((s) => s.audiences);
  const fetchAudiences = useAudiencesStore((s) => s.syncFromApi);
  const patchAudienceStatus = useAudiencesStore((s) => s.patchAudienceStatus);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [receptionDialogOpen, setReceptionDialogOpen] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'forward' | 'cabinet' | 'confirm' | 'reception'>('forward');

  const selectedAudience = useMemo(
    () => audiences.find((a) => a.id === selectedAudienceId),
    [audiences, selectedAudienceId],
  );

  // 0. Audiences en attente de transmission au Cabinet
  const toForward = useMemo(
    () =>
      audiences.filter(
        (a) => a.status === 'EN_ATTENTE' && isCemgRelatedAudience(a),
      ),
    [audiences],
  );

  // 0.5 Audiences au circuit CEMG — suivi Protocol (hors validations Chef de Cabinet)
  const atCabinet = useMemo(
    () => audiences.filter((a) => isProtocolCemgCabinetTracking(a)),
    [audiences],
  );

  // 1. Audiences validées par le CEMG → suivi Protocol uniquement
  const toConfirm = useMemo(
    () => audiences.filter((a) => isProtocolCemgConfirmQueue(a)),
    [audiences],
  );

  // 2. Audiences CEMG confirmées → réception Protocol (après accompagnement salle)
  const toReceive = useMemo(
    () =>
      audiences.filter((a) => {
        if (!isProtocolCemgReceptionQueue(a)) return false;
        return a.statusHistory?.some((e) => e.comment?.startsWith('Accompagné au bureau'));
      }),
    [audiences],
  );

  const filteredToForward = toForward.filter(a =>
    !search || 
    a.reference.toLowerCase().includes(search.toLowerCase()) || 
    a.requesterName.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase())
  );

  const filteredToConfirm = toConfirm.filter(a => 
    !search || 
    a.reference.toLowerCase().includes(search.toLowerCase()) || 
    a.requesterName.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAtCabinet = atCabinet.filter(a => 
    !search || 
    a.reference.toLowerCase().includes(search.toLowerCase()) || 
    a.requesterName.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase())
  );

  const filteredToReceive = toReceive.filter(a => 
    !search || 
    a.reference.toLowerCase().includes(search.toLowerCase()) || 
    a.requesterName.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase())
  );

  type ProtocolTabId = 'forward' | 'cabinet' | 'confirm' | 'reception';

  const protocolTabs: {
    id: ProtocolTabId;
    label: string;
    description: string;
    count: number;
    borderClass: string;
    accentClass: string;
    dotClass: string;
    badgeClass: string;
  }[] = [
    {
      id: 'forward',
      label: 'Nouvelles demandes — À transmettre',
      description: 'Audiences en attente de tri — À envoyer au Chef de Cabinet pour analyse',
      count: filteredToForward.length,
      borderClass: 'border-blue-500/20',
      accentClass: 'text-blue-500',
      dotClass: 'bg-blue-500',
      badgeClass: 'text-blue-500/60',
    },
    {
      id: 'cabinet',
      label: 'En attente d\'approbation du CEMG',
      description: 'Audiences transmises au Chef de Cabinet — En attente de décision finale',
      count: filteredAtCabinet.length,
      borderClass: 'border-indigo-500/20',
      accentClass: 'text-indigo-400',
      dotClass: 'bg-indigo-500',
      badgeClass: 'text-indigo-500/60',
    },
    {
      id: 'confirm',
      label: 'Suivi CEMG — À confirmer',
      description: 'Audiences validées par le CEMG — confirmation Protocol pour accompagnement',
      count: filteredToConfirm.length,
      borderClass: 'border-amber-500/20',
      accentClass: 'text-amber-500',
      dotClass: 'bg-amber-500',
      badgeClass: 'text-amber-500/60',
    },
    {
      id: 'reception',
      label: 'Réception CEMG',
      description: 'Audiences CEMG accompagnées — confirmation de réception par le Protocol',
      count: filteredToReceive.length,
      borderClass: 'border-gold-500/20',
      accentClass: 'text-gold-500',
      dotClass: 'bg-gold-500',
      badgeClass: 'text-gold-500/60',
    },
  ];

  const currentTab = protocolTabs.find((t) => t.id === activeTab) ?? protocolTabs[0];

  const renderEmptyState = (message: string) => (
    <div className="py-12 text-center border border-dashed border-military-900/30 rounded-2xl opacity-20">
      <p className="text-xs font-mono uppercase tracking-[0.2em]">{message}</p>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'forward':
        return filteredToForward.length ? filteredToForward.map((aud) => (
          <div key={aud.id} className="p-5 rounded-2xl bg-carbon-800/30 border border-military-800/30 hover:border-blue-500/30 transition-all group">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-blue-500 bg-blue-950/50 px-2 py-0.5 rounded border border-blue-900/30">{aud.reference}</span>
                  <PriorityBadge priority={aud.priority} />
                </div>
                <h3 className="text-lg font-bold text-cream group-hover:text-white transition-colors">{aud.subject}</h3>
                <div className="flex items-center gap-4 text-xs text-cream/40">
                  <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> {aud.requesterName}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => { setSelectedAudienceId(aud.id); setForwardDialogOpen(true); }}
                >
                  <Send className="w-4 h-4" /> Transmettre au Cabinet
                </Button>
                <Link href={`/audiences/${aud.id}`} className="text-[10px] font-mono text-military-500 hover:text-military-400 uppercase tracking-widest flex items-center gap-1">
                  Détails <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )) : renderEmptyState('Aucune nouvelle demande');

      case 'cabinet':
        return filteredAtCabinet.length ? filteredAtCabinet.map((aud) => (
          <div key={aud.id} className="p-5 rounded-2xl bg-carbon-800/30 border border-military-800/30 hover:border-indigo-500/30 transition-all group">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/30">{aud.reference}</span>
                  <StatusBadge status={aud.status} className="scale-75 origin-left" />
                </div>
                <h3 className="text-lg font-bold text-cream group-hover:text-white transition-colors">{aud.subject}</h3>
                <div className="flex items-center gap-4 text-xs text-cream/40">
                  <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> {aud.requesterName}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <Link href={`/audiences/${aud.id}`} className="text-[10px] font-mono text-military-500 hover:text-military-400 uppercase tracking-widest flex items-center gap-1">
                  Consulter <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )) : renderEmptyState('Aucune audience au cabinet');

      case 'confirm':
        return filteredToConfirm.length ? filteredToConfirm.map((aud) => (
          <div key={aud.id} className="p-5 rounded-2xl bg-carbon-800/30 border border-military-800/30 hover:border-amber-500/30 transition-all group">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-amber-500 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900/30">{aud.reference}</span>
                  <PriorityBadge priority={aud.priority} />
                </div>
                <h3 className="text-lg font-bold text-cream group-hover:text-white transition-colors">{aud.subject}</h3>
                <div className="flex items-center gap-4 text-xs text-cream/40">
                  <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> {aud.requesterName}</span>
                  <span className="w-1 h-1 rounded-full bg-military-800" />
                  <span>{aud.category}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-500 text-white border-amber-400/20"
                  onClick={() => { setSelectedAudienceId(aud.id); setConfirmDialogOpen(true); }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Faire le suivi
                </Button>
                <Link href={`/audiences/${aud.id}`} className="text-[10px] font-mono text-military-500 hover:text-military-400 uppercase tracking-widest flex items-center gap-1">
                  Détails <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )) : renderEmptyState('Aucune audience en attente de suivi');

      case 'reception':
        return filteredToReceive.length ? filteredToReceive.map((aud) => (
          <div key={aud.id} className="p-5 rounded-2xl bg-carbon-800/30 border border-military-800/30 hover:border-gold-500/30 transition-all group">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-gold-500 bg-gold-950/50 px-2 py-0.5 rounded border border-gold-900/30">{aud.reference}</span>
                  <StatusBadge status={aud.status} />
                </div>
                <h3 className="text-lg font-bold text-cream group-hover:text-white transition-colors">{aud.subject}</h3>
                <p className="text-xs text-cream/40 italic">{aud.requesterName} — {aud.requesterOrg ?? 'Individuel'}</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <Button
                  size="sm"
                  variant="gold"
                  onClick={() => { setSelectedAudienceId(aud.id); setReceptionDialogOpen(true); }}
                >
                  <UserCheck className="w-4 h-4" /> Confirmer réception
                </Button>
                <Link href={`/audiences/${aud.id}`} className="text-[10px] font-mono text-military-500 hover:text-military-400 uppercase tracking-widest flex items-center gap-1">
                  Détails <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )) : renderEmptyState('Aucune audience confirmée en attente');

      default: {
        const _exhaustive: never = activeTab;
        return _exhaustive;
      }
    }
  };

  const handleForwardToCabinet = async () => {
    if (!accessToken || !selectedAudienceId) return;
    setActionLoading(true);
    setActionError('');
    try {
      await forwardToDircabApi(accessToken, selectedAudienceId);
      patchAudienceStatus(selectedAudienceId, 'DEJA_ENVOYE');
      notifyAudienceSync({
        type: 'updated',
        audienceId: selectedAudienceId,
        ...buildForwardAlertSync(false),
      });
      await fetchAudiences(accessToken, { silent: true });
      setForwardDialogOpen(false);
      setSelectedAudienceId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la transmission');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmFollowUp = async () => {
    if (!accessToken || !selectedAudienceId) return;
    setActionLoading(true);
    setActionError('');
    try {
      await confirmAudienceApi(accessToken, selectedAudienceId);
      patchAudienceStatus(selectedAudienceId, 'CONFIRMEE');
      notifyAudienceSync({
        type: 'confirmed',
        audienceId: selectedAudienceId,
        ...buildProtocolFollowUpAlertSync(),
      });
      await fetchAudiences(accessToken, { silent: true });
      setConfirmDialogOpen(false);
      setSelectedAudienceId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la confirmation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteReception = async () => {
    if (!accessToken || !selectedAudienceId) return;
    setActionLoading(true);
    setActionError('');
    try {
      const updated = await completeReceptionApi(accessToken, selectedAudienceId);
      patchAudienceStatus(updated.id, 'TERMINEE');
      notifyAudienceSync({ type: 'reception-completed', audienceId: updated.id });
      await fetchAudiences(accessToken, { silent: true });
      setReceptionDialogOpen(false);
      setSelectedAudienceId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la réception');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8 noise-overlay">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-gold-500 pl-6 py-2"
        >
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-cream tracking-tight uppercase font-display">
              Suivi <span className="text-gold-500">Protocol</span>
            </h1>
            <p className="text-military-400/60 mt-1 font-mono text-xs tracking-[0.2em] uppercase">
              Interface de Coordination — Cabinet Chef EMG
            </p>
          </div>
          <div className="text-right">
            <p className="text-cream/40 font-mono text-xs uppercase tracking-wider">
              {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
            </p>
            <p className="text-gold-500 font-mono text-[10px] mt-1">ROLE: PROTOCOL // ACCESS: SECURE</p>
          </div>
        </motion.div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card tactical className="bg-military-900/10 border-military-800/30 cursor-pointer hover:border-blue-500/30 transition-colors" onClick={() => setActiveTab('forward')}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-military-500 uppercase tracking-widest font-mono font-bold">À Transmettre</p>
                <p className="text-3xl font-bold text-cream font-display">{toForward.length}</p>
              </div>
            </div>
          </Card>
          <Card tactical className="bg-military-900/10 border-military-800/30 cursor-pointer hover:border-indigo-500/30 transition-colors" onClick={() => setActiveTab('cabinet')}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-military-500 uppercase tracking-widest font-mono font-bold">Au Cabinet</p>
                <p className="text-3xl font-bold text-cream font-display">{atCabinet.length}</p>
              </div>
            </div>
          </Card>
          <Card tactical className="bg-military-900/10 border-military-800/30 cursor-pointer hover:border-amber-500/30 transition-colors" onClick={() => setActiveTab('confirm')}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-military-500 uppercase tracking-widest font-mono font-bold">À Confirmer</p>
                <p className="text-3xl font-bold text-cream font-display">{toConfirm.length}</p>
              </div>
            </div>
          </Card>
          <Card tactical className="bg-military-900/10 border-military-800/30 cursor-pointer hover:border-gold-500/30 transition-colors" onClick={() => setActiveTab('reception')}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gold-500/10 text-gold-500 border border-gold-500/20">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-military-500 uppercase tracking-widest font-mono font-bold">En Réception</p>
                <p className="text-3xl font-bold text-cream font-display">{toReceive.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une audience (réf, nom, objet)..."
                className="w-full h-12 pl-10 pr-4 rounded-2xl bg-carbon-900/50 border border-military-800/30 text-sm focus:outline-none focus:border-gold-500/50 transition-all"
              />
            </div>

            {/* Onglets workflow */}
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              {protocolTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-[140px] max-w-[240px]',
                    activeTab === tab.id
                      ? `${tab.borderClass} bg-carbon-800/80 ${tab.accentClass}`
                      : 'border-transparent bg-carbon-900/30 text-cream/50 hover:text-cream hover:bg-carbon-800/40',
                  )}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className={cn('w-2 h-2 rounded-full shrink-0', tab.dotClass, activeTab !== tab.id && 'opacity-40')} />
                  <span className="text-[11px] font-medium leading-tight line-clamp-2">{tab.label}</span>
                  <span className={cn('ml-auto text-[10px] font-mono tabular-nums shrink-0', tab.badgeClass)}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <Card tactical scanlines className={currentTab.borderClass}>
              <CardHeader className="border-b border-military-800/50 pb-4 mb-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className={cn('w-2 h-6 rounded-full animate-pulse', currentTab.dotClass)} />
                    {currentTab.label}
                  </CardTitle>
                  <span className={cn('text-[10px] font-mono uppercase tracking-widest', currentTab.badgeClass)}>
                    {currentTab.count} AUDIENCE{currentTab.count !== 1 ? 'S' : ''}
                  </span>
                </div>
                <CardDescription className="text-[10px] font-mono uppercase tracking-wider mt-1">
                  {currentTab.description}
                </CardDescription>
              </CardHeader>

              <div className="space-y-4">
                {renderTabContent()}
              </div>
            </Card>

          <Card className="bg-gold-950/10 border-gold-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gold-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Rappel Mission Protocol
              </CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-3 text-xs text-cream/60 leading-relaxed">
              <p>1. <strong className="text-cream">Suivi :</strong> Confirmez systématiquement les audiences validées pour informer la salle d&apos;attente.</p>
              <p>2. <strong className="text-cream">Réception :</strong> Attestez la présence effective du demandeur dès son entrée en bureau.</p>
              <p>3. <strong className="text-cream">Coordination :</strong> Maintenez le contact avec les agents d&apos;accompagnement via le statut CONFIRMÉE.</p>
            </div>
          </Card>
        </div>

        {/* Dialogs */}
        <ConfirmDialog
          open={forwardDialogOpen}
          onOpenChange={setForwardDialogOpen}
          title="Transmettre au Cabinet ?"
          description={selectedAudience?.priority !== 'PRIORITE_0' 
            ? "Cette action envoie la demande au Chef de Cabinet pour analyse et décision du CEMG." 
            : "Cette action transmet la demande de Priorité 0 directement pour décision du CEMG."
          }
          confirmLabel="Transmettre"
          cancelLabel="Annuler"
          loading={actionLoading}
          loadingLabel="Transmission…"
          variant="default"
          onConfirm={handleForwardToCabinet}
        >
          {actionError && (
            <p className="text-sm text-red-400 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 mt-2">
              {actionError}
            </p>
          )}
        </ConfirmDialog>

        <ConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          title="Confirmer le suivi de l'audience ?"
          description="Cette action valide le passage au Protocol et autorise l'accompagnement du visiteur par la salle d'attente."
          confirmLabel="Confirmer le suivi"
          cancelLabel="Annuler"
          loading={actionLoading}
          loadingLabel="Traitement…"
          variant="default"
          onConfirm={handleConfirmFollowUp}
        >
          {actionError && (
            <p className="text-sm text-red-400 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 mt-2">
              {actionError}
            </p>
          )}
        </ConfirmDialog>

        <ConfirmDialog
          open={receptionDialogOpen}
          onOpenChange={setReceptionDialogOpen}
          title="Confirmer la réception du visiteur ?"
          description="Cette action atteste que le demandeur a été reçu par le Chef d'Etat Major Général. L'audience sera clôturée."
          confirmLabel="Confirmer la réception"
          cancelLabel="Annuler"
          loading={actionLoading}
          loadingLabel="Clôture…"
          variant="default"
          onConfirm={handleCompleteReception}
        >
          {actionError && (
            <p className="text-sm text-red-400 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 mt-2">
              {actionError}
            </p>
          )}
        </ConfirmDialog>
      </div>
    </AuthGuard>
  );
}
