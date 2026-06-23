'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  FileText,
  Users,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import { isSecretariatWorkspaceAudience } from '@/lib/audience-utils';
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

export function SecretariatView() {
  const [time, setTime] = useState(new Date());
  const audiences = useAudiencesStore((s) => s.audiences);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const workspace = audiences.filter((a) => isSecretariatWorkspaceAudience(a, 'SECRETAIRE'));
  const toPlan = workspace.filter((a) => a.status === 'VALIDEE');
  const planned = workspace.filter((a) => ['PLANIFIEE', 'CONFIRMEE'].includes(a.status));
  const inPipeline = workspace.filter((a) => ['EN_ATTENTE', 'DEJA_ENVOYE', 'TRANSMIS_DIRCAB', 'EN_ANALYSE'].includes(a.status));
  const todayScheduled = planned.filter((a) => a.scheduledAt && isToday(a.scheduledAt));
  const upcoming = planned
    .filter((a) => a.scheduledAt && !isToday(a.scheduledAt))
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 6);

  const statCards = [
    { label: 'À planifier', value: toPlan.length, icon: Clock, tone: 'text-amber-400', glow: toPlan.length > 0 },
    { label: 'Planifiées', value: countByStatus(workspace, 'PLANIFIEE'), icon: Calendar, tone: 'text-blue-400' },
    { label: 'Confirmées', value: countByStatus(workspace, 'CONFIRMEE'), icon: CheckCircle2, tone: 'text-green-400' },
    { label: 'Pipeline', value: inPipeline.length, icon: FileText, tone: 'text-cream/60' },
    { label: 'Aujourd\'hui', value: todayScheduled.length, icon: ClipboardList, tone: 'text-military-300' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] relative noise-overlay">
      <div className="absolute inset-0 bg-gradient-to-br from-carbon-950 via-[#0a1220] to-carbon-950 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="relative z-10 p-4 lg:p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-blue-900/20 pb-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900/40 to-carbon-900 flex items-center justify-center border border-blue-500/30">
              <ClipboardList className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-[0.2em] text-cream uppercase font-display">
                Espace <span className="text-blue-400">Secrétariat</span>
              </h1>
              <p className="text-[10px] text-blue-400/70 font-mono uppercase tracking-widest mt-1">
                Planification et suivi opérationnel des audiences
              </p>
            </div>
          </div>
          <div className="font-mono text-3xl lg:text-4xl text-blue-300 tabular-nums px-6 py-3 rounded-2xl glass-strong border border-blue-900/30">
            {time.toLocaleTimeString('fr-FR')}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className={cn('border-blue-900/20 bg-carbon-900/40 hover:border-blue-700/30 transition-all', stat.glow && 'border-amber-900/30')}>
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

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="border-blue-900/20">
            <CardHeader className="border-b border-blue-900/20 pb-4 mb-6">
              <CardTitle className="text-lg flex items-center gap-3 text-amber-400">
                <Clock className="w-5 h-5" />
                Audiences à planifier
              </CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                Audiences validées en attente de créneau
              </CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {toPlan.length ? (
                toPlan.map((aud) => (
                  <Link
                    key={aud.id}
                    href={`/audiences/${aud.id}`}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl bg-carbon-900/40 border border-amber-900/20 hover:border-amber-600/40 transition-all group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-amber-500">{aud.reference}</span>
                        <PriorityBadge priority={aud.priority} className="scale-75 origin-left" />
                      </div>
                      <p className="text-sm font-bold text-cream group-hover:text-white truncate">{aud.subject}</p>
                      <p className="text-[10px] text-cream/40 mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {aud.requesterName}
                      </p>
                    </div>
                    <StatusBadge status={aud.status} className="scale-90 shrink-0" />
                  </Link>
                ))
              ) : (
                <div className="py-12 text-center border border-dashed border-blue-900/20 rounded-2xl opacity-30">
                  <p className="font-mono text-xs uppercase tracking-[0.2em]">Rien à planifier</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="border-blue-900/20">
            <CardHeader className="border-b border-blue-900/20 pb-4 mb-6">
              <CardTitle className="text-lg flex items-center gap-3 text-blue-300">
                <Calendar className="w-5 h-5" />
                Engagements du jour
              </CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                Planifiées ou confirmées pour aujourd&apos;hui
              </CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {todayScheduled.length ? (
                todayScheduled.map((aud) => (
                  <Link
                    key={aud.id}
                    href={`/audiences/${aud.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-carbon-900/40 border border-blue-900/20 hover:border-blue-600/40 transition-all group"
                  >
                    <div className="text-center min-w-[64px] px-2 py-1.5 rounded-lg bg-blue-900/30 border border-blue-700/30">
                      <p className="text-sm font-bold text-blue-300 font-mono">
                        {new Date(aud.scheduledAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-cream truncate">{aud.subject}</p>
                      <p className="text-[10px] text-cream/40">{aud.reference}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cream/20 group-hover:text-blue-400 shrink-0" />
                  </Link>
                ))
              ) : (
                <div className="py-12 text-center border border-dashed border-blue-900/20 rounded-2xl opacity-30">
                  <p className="font-mono text-xs uppercase tracking-[0.2em]">Aucun engagement aujourd&apos;hui</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className="border-blue-900/20">
          <CardHeader className="border-b border-blue-900/20 pb-4 mb-6">
            <CardTitle className="text-lg flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-400" />
              Prochains créneaux
            </CardTitle>
          </CardHeader>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.length ? (
              upcoming.map((aud) => (
                <Link
                  key={aud.id}
                  href={`/audiences/${aud.id}`}
                  className="p-4 rounded-xl bg-carbon-900/40 border border-blue-900/15 hover:border-blue-600/30 transition-all group"
                >
                  <p className="text-[10px] font-mono text-blue-500 mb-2">{aud.reference}</p>
                  <p className="text-sm font-bold text-cream group-hover:text-blue-200 truncate">{aud.subject}</p>
                  <p className="text-xs text-cream/40 mt-2">{formatDate(aud.scheduledAt)}</p>
                  <div className="mt-3">
                    <StatusBadge status={aud.status} className="scale-90 origin-left" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-10 text-center border border-dashed border-blue-900/20 rounded-2xl opacity-30">
                <p className="font-mono text-xs uppercase tracking-[0.2em]">Aucun créneau à venir</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
