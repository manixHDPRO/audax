'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Clock, Navigation, UserCheck, ClipboardList } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PRIORITY_LABELS, ROLE_LABELS, type UserRole, type WaitingRoomAudienceEntry } from '@/types';
import type {
  AccompanimentPendingApiRecord,
  ReceptionPendingApiRecord,
} from '@/lib/api-client';

type WaitingRoomTabId = 'accompany' | 'reception' | 'registrations';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatBureau(aud: AccompanimentPendingApiRecord) {
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
}

function renderEmptyState(message: string) {
  return (
    <div className="py-12 text-center border border-dashed border-military-900/30 rounded-2xl opacity-30">
      <p className="font-mono text-xs uppercase tracking-[0.2em]">{message}</p>
    </div>
  );
}

function resolveDefaultTab(canAccompany: boolean, canCompleteReception: boolean): WaitingRoomTabId {
  if (canAccompany) return 'accompany';
  if (canCompleteReception) return 'reception';
  return 'registrations';
}

export interface WaitingRoomViewProps {
  waitingRoomToday: WaitingRoomAudienceEntry[];
  isSyncing: boolean;
  canCreate: boolean;
  canAccompany: boolean;
  canCompleteReception: boolean;
  accompanimentPending: AccompanimentPendingApiRecord[];
  loadingAccompaniment: boolean;
  accompanimentError: string;
  accompanyingId: string | null;
  onCompleteAccompaniment: (audienceId: string) => void;
  receptionsPending: ReceptionPendingApiRecord[];
  loadingReceptions: boolean;
  receptionError: string;
  completingReceptionId: string | null;
  onCompleteReception: (audienceId: string) => void;
  onNewAudience: () => void;
}

export function WaitingRoomView({
  waitingRoomToday,
  isSyncing,
  canCreate,
  canAccompany,
  canCompleteReception,
  accompanimentPending,
  loadingAccompaniment,
  accompanimentError,
  accompanyingId,
  onCompleteAccompaniment,
  receptionsPending,
  loadingReceptions,
  receptionError,
  completingReceptionId,
  onCompleteReception,
  onNewAudience,
}: WaitingRoomViewProps) {
  const [activeTab, setActiveTab] = useState<WaitingRoomTabId>(() =>
    resolveDefaultTab(canAccompany, canCompleteReception),
  );

  const waitingRoomTabs: {
    id: WaitingRoomTabId;
    label: string;
    description: string;
    count: number;
    borderClass: string;
    accentClass: string;
    dotClass: string;
    badgeClass: string;
    visible: boolean;
  }[] = [
    {
      id: 'accompany',
      label: 'À accompagner',
      description:
        'Audiences confirmées — accompagnez le demandeur jusqu\'au bureau puis confirmez l\'accompagnement',
      count: accompanimentPending.length,
      borderClass: 'border-gold-500/20',
      accentClass: 'text-gold-400',
      dotClass: 'bg-gold-500',
      badgeClass: 'text-gold-500/60',
      visible: canAccompany,
    },
    {
      id: 'reception',
      label: 'Confirmer la réception',
      description:
        'Après accompagnement au bureau — confirmez que le visiteur a bien été reçu (hors circuit CEMG / Protocol)',
      count: receptionsPending.length,
      borderClass: 'border-military-500/20',
      accentClass: 'text-military-300',
      dotClass: 'bg-military-500',
      badgeClass: 'text-military-400/60',
      visible: canCompleteReception,
    },
    {
      id: 'registrations',
      label: 'Enregistrements du jour',
      description: 'Demandes enregistrées aujourd\'hui à la salle d\'attente',
      count: waitingRoomToday.length,
      borderClass: 'border-military-600/20',
      accentClass: 'text-cream/80',
      dotClass: 'bg-cream/50',
      badgeClass: 'text-cream/50',
      visible: true,
    },
  ];

  const visibleTabs = waitingRoomTabs.filter((t) => t.visible);
  const currentTab = visibleTabs.find((t) => t.id === activeTab) ?? visibleTabs[0];

  const statCards: {
    label: string;
    value: number;
    icon: typeof BellRing;
    tone: string;
    glow?: boolean;
    tab: WaitingRoomTabId;
    visible: boolean;
  }[] = [
    {
      label: 'À accompagner',
      value: accompanimentPending.length,
      icon: BellRing,
      tone: 'text-gold-400',
      glow: accompanimentPending.length > 0,
      tab: 'accompany',
      visible: canAccompany,
    },
    {
      label: 'Réception',
      value: receptionsPending.length,
      icon: UserCheck,
      tone: 'text-military-300',
      glow: receptionsPending.length > 0,
      tab: 'reception',
      visible: canCompleteReception,
    },
    {
      label: 'Enregistrés J-0',
      value: waitingRoomToday.length,
      icon: ClipboardList,
      tone: 'text-cream/70',
      tab: 'registrations',
      visible: true,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'accompany':
        if (!canAccompany) return null;
        return (
          <>
            {accompanimentError ? (
              <p className="text-sm text-red-400 mb-3 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2">
                {accompanimentError}
              </p>
            ) : null}
            {loadingAccompaniment && accompanimentPending.length === 0 ? (
              <p className="text-sm text-cream/40 text-center py-6">Chargement…</p>
            ) : accompanimentPending.length === 0 ? (
              renderEmptyState('Aucune audience confirmée en attente d\'accompagnement')
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
                            onClick={() => onCompleteAccompaniment(aud.id)}
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
          </>
        );

      case 'reception':
        if (!canCompleteReception) return null;
        return (
          <>
            {receptionError ? (
              <p className="text-sm text-red-400 mb-3 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2">
                {receptionError}
              </p>
            ) : null}
            {loadingReceptions && receptionsPending.length === 0 ? (
              <p className="text-sm text-cream/40 text-center py-6">Chargement…</p>
            ) : receptionsPending.length === 0 ? (
              renderEmptyState('Aucune audience en attente de confirmation de réception')
            ) : (
              <div className="space-y-2">
                {receptionsPending.map((aud) => {
                  const person = aud.visitTarget
                    ? `${aud.visitTarget.firstName} ${aud.visitTarget.lastName}`
                    : 'Bureau non renseigné';
                  return (
                    <Card key={aud.id} className="!p-4 border-military-600/40 bg-military-950/30">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="font-mono text-sm text-military-400 w-36 shrink-0">{aud.reference}</div>
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-semibold text-cream">{aud.requesterName}</p>
                          <p className="text-xs text-cream/45 mt-0.5 line-clamp-1">{aud.subject}</p>
                          <p className="text-xs text-cream/40 mt-1">Reçu par : {person}</p>
                        </div>
                        <Button
                          size="sm"
                          disabled={completingReceptionId === aud.id}
                          onClick={() => onCompleteReception(aud.id)}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {completingReceptionId === aud.id ? '…' : 'Confirmer la réception'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        );

      case 'registrations':
        if (isSyncing && waitingRoomToday.length === 0) {
          return <p className="text-sm text-cream/40 text-center py-6">Chargement…</p>;
        }
        if (waitingRoomToday.length === 0) {
          return (
            <div className="py-12 text-center border border-dashed border-military-900/30 rounded-2xl">
              <p className="text-sm text-cream/40">
                Aucun enregistrement aujourd&apos;hui.{' '}
                {canCreate ? (
                  <button
                    type="button"
                    onClick={onNewAudience}
                    className="text-military-400 hover:underline cursor-pointer"
                  >
                    Enregistrer une demande
                  </button>
                ) : null}
              </p>
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {waitingRoomToday.map((aud, i) => (
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
            ))}
          </div>
        );

      default: {
        const _exhaustive: never = activeTab;
        return _exhaustive;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards
          .filter((s) => s.visible)
          .map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={cn(
                  'border-military-800/30 bg-carbon-900/40 hover:border-military-600/40 transition-all cursor-pointer',
                  stat.glow && 'glow-critical border-amber-900/30',
                  stat.tab === activeTab && 'ring-1 ring-military-500/40 border-military-600/50',
                )}
                onClick={() => setActiveTab(stat.tab)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('p-1.5 rounded-lg bg-carbon-950/60', stat.tone)}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-cream/40">
                    {stat.label}
                  </span>
                </div>
                <p className={cn('text-3xl font-black font-display tracking-tight', stat.tone)}>
                  {String(stat.value).padStart(2, '0')}
                </p>
              </Card>
            </motion.div>
          ))}
      </div>

      <div className="space-y-4">
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {visibleTabs.map((tab) => (
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
              <span
                className={cn('w-2 h-2 rounded-full shrink-0', tab.dotClass, activeTab !== tab.id && 'opacity-40')}
              />
              <span className="text-[11px] font-medium leading-tight line-clamp-2">{tab.label}</span>
              <span className={cn('ml-auto text-[10px] font-mono tabular-nums shrink-0', tab.badgeClass)}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {currentTab ? (
          <Card tactical scanlines className={cn('border-military-700/30', currentTab.borderClass)}>
            <CardHeader className="border-b border-military-800/30 pb-4 mb-6">
              <CardTitle className={cn('text-lg flex items-center gap-3', currentTab.accentClass)}>
                {activeTab === 'accompany' && <BellRing className="w-5 h-5" />}
                {activeTab === 'reception' && <UserCheck className="w-5 h-5" />}
                {activeTab === 'registrations' && <ClipboardList className="w-5 h-5" />}
                {currentTab.label}
              </CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                {currentTab.description}
              </CardDescription>
            </CardHeader>
            {renderTabContent()}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
