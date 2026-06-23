'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Clock,
  Activity,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Users,
  Shield,
  Send,
  Hourglass,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  describeStatusHistoryEntry,
  isChefCabinetQueue,
  isChefPilotageAudience,
  isChefAwaitingCemgDelegation,
  isCemgRelatedAudience,
  isDelegatedToDircab,
  sortStatusHistoryNewestFirst,
} from '@/lib/audience-utils';
import { useAudiencesStore } from '@/stores/audiences-store';
import type { Audience } from '@/types';

type CabinetTabId = 'awaiting' | 'treat' | 'plan' | 'activity' | 'agenda';

function countByStatus(audiences: Audience[], status: Audience['status']) {
  return audiences.filter((a) => a.status === status).length;
}

function isToday(dateStr?: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toLocaleDateString('fr-FR') === now.toLocaleDateString('fr-FR');
}

function renderEmptyState(message: string) {
  return (
    <div className="py-12 text-center border border-dashed border-military-900/30 rounded-2xl opacity-30">
      <p className="font-mono text-xs uppercase tracking-[0.2em]">{message}</p>
    </div>
  );
}

export function CabinetMonitoringView() {
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<CabinetTabId>('treat');
  const audiences = useAudiencesStore((s) => s.audiences);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pilotageAudiences = audiences.filter((a) => isChefPilotageAudience(a, 'CHEF'));
  const cabinetQueue = audiences.filter((a) => isChefCabinetQueue(a, 'CHEF'));
  const awaitingCemg = cabinetQueue.filter((a) => isChefAwaitingCemgDelegation(a));
  const toValidate = cabinetQueue.filter((a) => {
    if (isChefAwaitingCemgDelegation(a)) return false;
    if (a.status === 'TRANSMIS_DIRCAB') return true;
    if (a.status === 'EN_ANALYSE' && isDelegatedToDircab(a)) return true;
    if (a.status === 'DEJA_ENVOYE' && !isCemgRelatedAudience(a)) return true;
    if (a.status === 'EN_ATTENTE' && !isCemgRelatedAudience(a)) return true;
    return false;
  });
  const toPlan = cabinetQueue.filter((a) => ['VALIDEE', 'PLANIFIEE'].includes(a.status));
  const todayScheduled = pilotageAudiences.filter((a) => a.scheduledAt && isToday(a.scheduledAt));

  const recentEvents = pilotageAudiences
    .flatMap((audience) =>
      sortStatusHistoryNewestFirst(audience.statusHistory).slice(0, 2).map((entry) => ({
        audience,
        entry,
        at: new Date(entry.createdAt).getTime(),
      })),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);

  const cabinetTabs: {
    id: CabinetTabId;
    label: string;
    description: string;
    count: number;
    borderClass: string;
    accentClass: string;
    dotClass: string;
    badgeClass: string;
  }[] = [
    {
      id: 'awaiting',
      label: 'Attente CEMG',
      description:
        'Transmises au Cabinet par le Protocol — en attente d\'éventuelle délégation au DirCab',
      count: awaitingCemg.length,
      borderClass: 'border-cream/20',
      accentClass: 'text-cream/80',
      dotClass: 'bg-cream/50',
      badgeClass: 'text-cream/50',
    },
    {
      id: 'treat',
      label: 'Audiences à traiter',
      description: 'Délégation CEMG reçue ou audience hors circuit CEMG — action requise',
      count: toValidate.length,
      borderClass: 'border-amber-500/20',
      accentClass: 'text-amber-400',
      dotClass: 'bg-amber-500',
      badgeClass: 'text-amber-500/60',
    },
    {
      id: 'plan',
      label: 'Planification',
      description: 'Audiences validées ou planifiées au Cabinet',
      count: toPlan.length,
      borderClass: 'border-military-500/20',
      accentClass: 'text-military-300',
      dotClass: 'bg-military-500',
      badgeClass: 'text-military-400/60',
    },
    {
      id: 'activity',
      label: 'Activité récente',
      description: 'Dernières actions sur les audiences du Cabinet',
      count: recentEvents.length,
      borderClass: 'border-military-600/20',
      accentClass: 'text-military-400',
      dotClass: 'bg-military-400',
      badgeClass: 'text-military-500/60',
    },
    {
      id: 'agenda',
      label: 'Agenda J-0',
      description: 'Engagements planifiés pour aujourd\'hui',
      count: todayScheduled.length,
      borderClass: 'border-gold-500/20',
      accentClass: 'text-gold-400',
      dotClass: 'bg-gold-500',
      badgeClass: 'text-gold-500/60',
    },
  ];

  const currentTab = cabinetTabs.find((t) => t.id === activeTab) ?? cabinetTabs[1];

  const statCards: {
    label: string;
    value: number;
    icon: typeof Briefcase;
    tone: string;
    glow?: boolean;
    tab?: CabinetTabId;
  }[] = [
    { label: 'Fil Cabinet', value: cabinetQueue.length, icon: Briefcase, tone: 'text-military-400' },
    {
      label: 'Attente CEMG',
      value: awaitingCemg.length,
      icon: Hourglass,
      tone: 'text-cream/70',
      glow: awaitingCemg.length > 0,
      tab: 'awaiting',
    },
    {
      label: 'À traiter',
      value: toValidate.length,
      icon: Clock,
      tone: 'text-amber-400',
      glow: toValidate.length > 0,
      tab: 'treat',
    },
    {
      label: 'En analyse',
      value: countByStatus(cabinetQueue, 'EN_ANALYSE'),
      icon: Activity,
      tone: 'text-blue-400',
      tab: 'treat',
    },
    {
      label: 'Planification',
      value: toPlan.length,
      icon: Send,
      tone: 'text-military-300',
      tab: 'plan',
    },
    {
      label: 'Engagements J-0',
      value: todayScheduled.length,
      icon: Calendar,
      tone: 'text-cream',
      tab: 'agenda',
    },
    {
      label: 'Confirmées',
      value: countByStatus(pilotageAudiences, 'CONFIRMEE'),
      icon: CheckCircle2,
      tone: 'text-green-400',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'awaiting':
        return awaitingCemg.length ? (
          <div className="grid md:grid-cols-2 gap-3">
            {awaitingCemg.map((aud) => (
              <Link
                key={aud.id}
                href={`/audiences/${aud.id}`}
                className="flex flex-col p-4 rounded-xl bg-military-950/20 border border-military-800/25 hover:border-cream/20 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-military-500">{aud.reference}</span>
                  <StatusBadge status={aud.status} className="scale-75 origin-right" />
                </div>
                <p className="text-sm font-semibold text-cream/90 group-hover:text-white line-clamp-1">{aud.subject}</p>
                <p className="text-[10px] text-cream/40 mt-2">{aud.requesterName}</p>
                <p className="text-[10px] text-cream/35 mt-3 font-mono uppercase tracking-wider">
                  En attente transmission CEMG → DirCab
                </p>
              </Link>
            ))}
          </div>
        ) : (
          renderEmptyState('Aucune audience en attente côté CEMG')
        );

      case 'treat':
        return toValidate.length ? (
          <div className="space-y-3">
            {toValidate.map((aud) => (
              <Link
                key={aud.id}
                href={`/audiences/${aud.id}`}
                className="flex flex-col p-4 rounded-2xl bg-military-900/20 hover:bg-military-900/40 border border-military-800/30 hover:border-gold-500/40 transition-all group data-[cemg=true]:border-gold-500/25 data-[cemg=true]:bg-gold-950/10"
                data-cemg={aud.status === 'TRANSMIS_DIRCAB' ? 'true' : undefined}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-military-500 bg-military-950/50 px-2 py-0.5 rounded border border-military-800/30">
                    {aud.reference}
                  </span>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={aud.priority} className="scale-75 origin-right" />
                    <StatusBadge status={aud.status} className="scale-90 origin-right" />
                  </div>
                </div>
                <p className="text-base font-bold text-cream group-hover:text-white transition-colors">{aud.subject}</p>
                <p className="text-[10px] text-cream/40 mt-2 flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  {aud.requesterName}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          renderEmptyState('Aucune audience en attente')
        );

      case 'plan':
        return toPlan.length ? (
          <div className="space-y-3">
            {toPlan.map((aud) => (
              <Link
                key={aud.id}
                href={`/audiences/${aud.id}`}
                className="flex flex-col p-4 rounded-xl bg-carbon-900/40 border border-military-800/30 hover:border-military-600/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-military-500">{aud.reference}</span>
                  <StatusBadge status={aud.status} className="scale-75 origin-right" />
                </div>
                <p className="text-sm font-medium text-cream group-hover:text-white line-clamp-1">{aud.subject}</p>
              </Link>
            ))}
          </div>
        ) : (
          renderEmptyState('Aucune planification active')
        );

      case 'activity':
        return recentEvents.length ? (
          <div className="space-y-3">
            {recentEvents.map(({ audience, entry }) => {
              const { title } = describeStatusHistoryEntry(entry);
              return (
                <Link
                  key={`${audience.id}-${entry.id}`}
                  href={`/audiences/${audience.id}`}
                  className="block p-3 rounded-xl hover:bg-military-900/20 border border-transparent hover:border-military-800/30 transition-all group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-mono text-military-600 uppercase">{audience.reference}</span>
                    <span className="text-[9px] font-mono text-cream/30">
                      {new Date(entry.createdAt).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-cream/70 group-hover:text-military-300">{title}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          renderEmptyState('Aucune activité')
        );

      case 'agenda':
        return todayScheduled.length ? (
          <div className="grid md:grid-cols-2 gap-4">
            {todayScheduled.map((aud) => (
              <Link
                key={aud.id}
                href={`/audiences/${aud.id}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-carbon-900/40 border border-military-800/30 hover:border-military-500/40 transition-all group"
              >
                <div className="text-center min-w-[72px] px-3 py-2 rounded-xl bg-military-900/40 border border-military-700/30">
                  <p className="text-sm font-bold text-gold-400 font-mono">
                    {new Date(aud.scheduledAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-cream group-hover:text-military-300 truncate">{aud.subject}</p>
                  <p className="text-[10px] text-cream/40 mt-1">{aud.reference}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-cream/20 group-hover:text-military-400 shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          renderEmptyState('Aucun engagement aujourd\'hui')
        );

      default: {
        const _exhaustive: never = activeTab;
        return _exhaustive;
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] relative noise-overlay">
      <div className="absolute inset-0 bg-gradient-to-br from-carbon-950 via-military-950/40 to-carbon-950 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-military-500/50 to-transparent" />

      <div className="relative z-10 p-4 lg:p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-military-800/30 pb-6">
          <div className="flex items-center gap-6">
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(74,124,74,0.2)',
                  '0 0 40px rgba(74,124,74,0.45)',
                  '0 0 20px rgba(74,124,74,0.2)',
                ],
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-military-700 to-military-900 flex items-center justify-center border border-military-500/50 glow-green"
            >
              <Briefcase className="w-7 h-7 text-gold-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-[0.25em] text-cream uppercase font-display">
                Pilotage <span className="text-military-400">Cabinet</span>
              </h1>
              <p className="text-[10px] text-military-400 font-mono flex items-center gap-2 uppercase tracking-widest mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Chef de Cabinet — audiences transmises par le Protocol ou déléguées par le CEMG
              </p>
            </div>
          </div>
          <div className="font-mono text-3xl lg:text-4xl text-gold-400 tabular-nums px-6 py-3 rounded-2xl glass-strong border border-military-800/50">
            {time.toLocaleTimeString('fr-FR')}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={cn(
                  'border-military-800/30 bg-carbon-900/40 hover:border-military-600/40 transition-all',
                  stat.glow && 'glow-critical border-amber-900/30',
                  stat.tab && 'cursor-pointer',
                  stat.tab === activeTab && 'ring-1 ring-military-500/40 border-military-600/50',
                )}
                onClick={stat.tab ? () => setActiveTab(stat.tab!) : undefined}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('p-1.5 rounded-lg bg-carbon-950/60', stat.tone)}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-cream/40">{stat.label}</span>
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
            {cabinetTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-[140px] max-w-[220px]',
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

          <Card tactical scanlines className={cn('border-military-700/30', currentTab.borderClass)}>
            <CardHeader className="border-b border-military-800/30 pb-4 mb-6">
              <CardTitle className={cn('text-lg flex items-center gap-3', currentTab.accentClass)}>
                {activeTab === 'awaiting' && <Hourglass className="w-5 h-5" />}
                {activeTab === 'treat' && <Clock className="w-5 h-5" />}
                {activeTab === 'plan' && <Send className="w-5 h-5" />}
                {activeTab === 'activity' && <Shield className="w-5 h-5" />}
                {activeTab === 'agenda' && <Calendar className="w-5 h-5" />}
                {currentTab.label}
              </CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                {currentTab.description}
              </CardDescription>
            </CardHeader>
            {renderTabContent()}
          </Card>
        </div>
      </div>
    </div>
  );
}
