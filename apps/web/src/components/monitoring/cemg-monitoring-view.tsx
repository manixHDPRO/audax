'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Crown,
  Clock,
  Activity,
  AlertTriangle,
  Shield,
  ArrowRight,
  Users,
  Calendar,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  describeStatusHistoryEntry,
  hasCemgDircabDelegation,
  isCemgCabinetHistoryAudience,
  isCemgPilotageAudience,
  isInCemgWaitingQueue,
  sortStatusHistoryNewestFirst,
} from '@/lib/audience-utils';
import { useAudiencesStore } from '@/stores/audiences-store';
import type { Audience } from '@/types';

function countByStatus(audiences: Audience[], status: Audience['status']) {
  return audiences.filter((a) => a.status === status).length;
}

function isToday(dateStr?: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toLocaleDateString('fr-FR') === now.toLocaleDateString('fr-FR');
}

export function CemgMonitoringView() {
  const [time, setTime] = useState(new Date());
  const audiences = useAudiencesStore((s) => s.audiences);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const waitingPool = audiences.filter((a) => isInCemgWaitingQueue(a, 'CEMG'));
  const cabinetHistory = audiences.filter((a) => isCemgCabinetHistoryAudience(a, 'CEMG'));
  const pilotageAudiences = audiences.filter((a) => isCemgPilotageAudience(a, 'CEMG'));
  const priority0 = waitingPool.filter((a) => a.priority === 'PRIORITE_0');
  const otherWaiting = waitingPool.filter((a) => a.priority !== 'PRIORITE_0');
  const todayScheduled = waitingPool.filter((a) => a.scheduledAt && isToday(a.scheduledAt));

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

  const statCards = [
    {
      label: 'Fil d\'attente',
      value: waitingPool.length,
      icon: Clock,
      tone: 'text-amber-400',
    },
    {
      label: 'Priorité 0',
      value: priority0.length,
      icon: Crown,
      tone: 'text-gold-400',
      glow: priority0.length > 0,
    },
    {
      label: 'En analyse',
      value: countByStatus(waitingPool, 'EN_ANALYSE'),
      icon: Activity,
      tone: 'text-blue-400',
    },
    {
      label: 'Délégations Cabinet',
      value: cabinetHistory.filter((a) => ['DEJA_ENVOYE', 'EN_ANALYSE'].includes(a.status)).length,
      icon: Send,
      tone: 'text-military-400',
    },
    {
      label: 'Engagements J-0',
      value: todayScheduled.length,
      icon: Calendar,
      tone: 'text-cream',
    },
    {
      label: 'Critiques',
      value: waitingPool.filter((a) => a.priority === 'CRITIQUE').length,
      icon: AlertTriangle,
      tone: 'text-red-400',
      glow: waitingPool.some((a) => a.priority === 'CRITIQUE'),
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] relative noise-overlay">
      <div className="absolute inset-0 bg-gradient-to-br from-carbon-950 via-[#0a0f1a] to-carbon-950 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />

      <div className="relative z-10 p-4 lg:p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-gold-500/10 pb-6">
          <div className="flex items-center gap-6">
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 24px rgba(201,162,39,0.15)',
                  '0 0 48px rgba(201,162,39,0.35)',
                  '0 0 24px rgba(201,162,39,0.15)',
                ],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-700/30 to-carbon-900 flex items-center justify-center border border-gold-500/30"
            >
              <Crown className="w-7 h-7 text-gold-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-[0.25em] text-cream uppercase font-display">
                Pilotage <span className="text-gold-400">CEMG</span>
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] text-gold-500/80 font-mono flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse shadow-[0_0_8px_rgba(201,162,39,0.6)]" />
                  Vue exécutive — Cabinet Chef EMG
                </p>
              </div>
            </div>
          </div>

          <div className="font-mono text-3xl lg:text-4xl text-gold-400 tabular-nums px-6 py-3 rounded-2xl glass-strong border border-gold-500/20 shadow-2xl">
            {time.toLocaleTimeString('fr-FR')}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={cn(
                  'border-gold-500/10 bg-carbon-900/40 hover:border-gold-500/25 transition-all',
                  stat.glow && 'glow-critical border-red-900/30',
                )}
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

        <div className="grid lg:grid-cols-12 gap-8">
          <motion.div className="lg:col-span-5" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <Card tactical scanlines className="h-full border-gold-500/15 bg-gold-950/5">
              <CardHeader className="border-b border-gold-500/10 pb-4 mb-6">
                <CardTitle className="text-lg flex items-center gap-3 text-gold-400">
                  <Crown className="w-5 h-5" />
                  Priorité 0 — Décision requise
                </CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                  Dossiers réservés au Chef EMG avant délégation éventuelle
                </CardDescription>
              </CardHeader>
              <div className="space-y-3">
                {priority0.length ? (
                  priority0.map((aud) => (
                    <Link
                      key={aud.id}
                      href={`/audiences/${aud.id}`}
                      className="flex flex-col p-4 rounded-2xl bg-gold-500/5 hover:bg-gold-500/10 border border-gold-500/20 hover:border-gold-500/40 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-gold-500 bg-gold-950/50 px-2 py-0.5 rounded border border-gold-500/30">
                          {aud.reference}
                        </span>
                        <StatusBadge status={aud.status} className="scale-90 origin-right" />
                      </div>
                      <p className="text-base font-bold text-cream group-hover:text-white transition-colors">
                        {aud.subject}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-[10px] text-cream/40 flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          {aud.requesterName}
                        </p>
                        {hasCemgDircabDelegation(aud) ? (
                          <span className="text-[9px] font-mono text-military-400 uppercase tracking-widest">
                            Délégation DirCab
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-gold-500 uppercase tracking-widest">
                            Action CEMG
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center opacity-30">
                    <CheckCircle2 className="w-12 h-12 mb-3 text-gold-500" />
                    <p className="font-mono text-xs uppercase tracking-[0.3em]">Aucune priorité 0 en attente</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div className="lg:col-span-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="h-full flex flex-col border-military-800/30">
              <CardHeader className="border-b border-military-800/30 pb-4 mb-6">
                <CardTitle className="text-lg flex items-center gap-3 text-military-300">
                  <Clock className="w-5 h-5 text-military-500" />
                  Fil d&apos;attente actif
                </CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                  Dossiers en cours au Cabinet CEMG
                </CardDescription>
              </CardHeader>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {otherWaiting.length ? (
                  otherWaiting.slice(0, 10).map((aud) => (
                    <Link
                      key={aud.id}
                      href={`/audiences/${aud.id}`}
                      className="flex flex-col p-4 rounded-xl bg-carbon-900/40 border border-military-800/30 hover:border-military-600/40 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-military-500">{aud.reference}</span>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={aud.priority} className="scale-75 origin-right" />
                          <StatusBadge status={aud.status} className="scale-75 origin-right" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-cream group-hover:text-white line-clamp-1">
                        {aud.subject}
                      </p>
                      <p className="text-[10px] text-cream/40 mt-2">{aud.requesterName}</p>
                    </Link>
                  ))
                ) : (
                  <div className="py-12 text-center border border-dashed border-military-900/30 rounded-2xl opacity-30">
                    <p className="font-mono text-xs uppercase tracking-[0.2em]">Fil d&apos;attente vide</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div className="lg:col-span-3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="h-full border-military-800/30">
              <CardHeader className="border-b border-military-800/30 pb-4 mb-6">
                <CardTitle className="text-lg flex items-center gap-3">
                  <Send className="w-5 h-5 text-military-500" />
                  Délégations Cabinet
                </CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                  Suivi des transmissions au Chef de Cabinet
                </CardDescription>
              </CardHeader>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {cabinetHistory.length ? (
                  cabinetHistory.slice(0, 8).map((aud) => (
                    <Link
                      key={aud.id}
                      href={`/audiences/${aud.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-carbon-900/40 border border-military-800/20 hover:border-military-600/40 transition-all group"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-military-500">{aud.reference}</p>
                        <p className="text-sm font-medium text-cream truncate group-hover:text-white">
                          {aud.subject}
                        </p>
                      </div>
                      <StatusBadge status={aud.status} className="scale-75 origin-right shrink-0" />
                    </Link>
                  ))
                ) : (
                  <div className="py-12 text-center border border-dashed border-military-900/30 rounded-2xl opacity-30">
                    <p className="font-mono text-xs uppercase tracking-[0.2em]">Aucune délégation</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card tactical className="border-gold-500/10">
            <CardHeader className="flex-row items-center justify-between border-b border-gold-500/10 pb-4 mb-6">
              <div>
                <CardTitle className="text-lg flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gold-400" />
                  Agenda du jour
                </CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider mt-1">
                  Engagements planifiés — Cabinet CEMG
                </CardDescription>
              </div>
              <span className="text-[10px] font-mono text-gold-500/70 uppercase tracking-widest">
                J-0 // {todayScheduled.length}
              </span>
            </CardHeader>
            <div className="space-y-3">
              {todayScheduled.length ? (
                todayScheduled.map((aud) => (
                  <Link
                    key={aud.id}
                    href={`/audiences/${aud.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-carbon-900/40 border border-gold-500/10 hover:border-gold-500/30 transition-all group"
                  >
                    <div className="text-center min-w-[72px] px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/20">
                      <p className="text-sm font-bold text-gold-400 font-mono">
                        {new Date(aud.scheduledAt!).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-cream group-hover:text-gold-300 transition-colors truncate">
                        {aud.subject}
                      </p>
                      <p className="text-[10px] text-cream/40 mt-1">{aud.reference}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cream/20 group-hover:text-gold-400 shrink-0" />
                  </Link>
                ))
              ) : (
                <div className="py-10 text-center border border-dashed border-gold-500/10 rounded-2xl opacity-30">
                  <p className="font-mono text-xs uppercase tracking-[0.2em]">Aucun engagement aujourd&apos;hui</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="border-military-800/30">
            <CardHeader className="border-b border-military-800/30 pb-4 mb-6">
              <CardTitle className="text-lg flex items-center gap-3">
                <Shield className="w-5 h-5 text-military-500" />
                Activité récente
              </CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                Derniers mouvements sur les dossiers CEMG
              </CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {recentEvents.length ? (
                recentEvents.map(({ audience, entry }) => {
                  const { title, detail } = describeStatusHistoryEntry(entry);
                  return (
                    <Link
                      key={`${audience.id}-${entry.id}`}
                      href={`/audiences/${audience.id}`}
                      className="block p-3 rounded-xl hover:bg-military-900/20 border border-transparent hover:border-military-800/30 transition-all group"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-mono text-military-600 uppercase tracking-widest">
                          {audience.reference}
                        </span>
                        <span className="text-[9px] font-mono text-cream/30">
                          {new Date(entry.createdAt).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-cream/70 group-hover:text-military-300">{title}</p>
                      {detail ? (
                        <p className="text-[10px] text-cream/40 mt-1 line-clamp-1">{detail}</p>
                      ) : null}
                    </Link>
                  );
                })
              ) : (
                <div className="py-10 text-center border border-dashed border-military-900/30 rounded-2xl opacity-30">
                  <p className="font-mono text-xs uppercase tracking-[0.2em]">Aucune activité récente</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
