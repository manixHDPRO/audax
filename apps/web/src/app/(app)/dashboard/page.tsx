'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  TrendingUp,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data';
import { formatDateShort } from '@/lib/utils';
import { useAudiencesStore } from '@/stores/audiences-store';
import type { Audience } from '@/types';

function countByStatus(audiences: Audience[], status: Audience['status']) {
  return audiences.filter((a) => a.status === status).length;
}

export default function DashboardPage() {
  const audiences = useAudiencesStore((s) => s.audiences);

  const statCards = [
    { label: 'En attente', value: countByStatus(audiences, 'EN_ATTENTE'), icon: Clock, color: 'text-amber-400' },
    { label: 'En analyse', value: countByStatus(audiences, 'EN_ANALYSE'), icon: Activity, color: 'text-blue-400' },
    { label: 'Validées', value: countByStatus(audiences, 'VALIDEE'), icon: CheckCircle2, color: 'text-military-400' },
    { label: 'Critiques', value: audiences.filter((a) => a.priority === 'CRITIQUE').length, icon: AlertTriangle, color: 'text-red-400' },
  ];

  const urgent = audiences.filter((a) => ['URGENTE', 'CRITIQUE'].includes(a.priority) && !['TERMINEE', 'REJETEE'].includes(a.status));
  const today = audiences.filter((a) => a.scheduledAt);

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl lg:text-3xl font-bold text-cream">Dashboard exécutif</h1>
          <p className="text-cream/50 mt-1">Vue synthétique — {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</p>
        </motion.div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card glow={stat.label === 'Critiques'} className="relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-cream/40 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2 text-cream">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-carbon-800 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-military-600/30 to-transparent" />
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Urgent list */}
          <motion.div className="lg:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Demandes prioritaires</CardTitle>
                  <CardDescription>Audiences urgentes et critiques en cours</CardDescription>
                </div>
                <Link href="/audiences" className="text-xs text-military-400 hover:text-military-300 flex items-center gap-1">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <div className="space-y-3">
                {urgent.length ? urgent.map((aud) => (
                  <Link
                    key={aud.id}
                    href={`/audiences/${aud.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl bg-carbon-800/50 hover:bg-carbon-800 border border-transparent hover:border-military-700/30 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-military-400">{aud.reference}</span>
                        <PriorityBadge priority={aud.priority} />
                      </div>
                      <p className="text-sm font-medium text-cream truncate">{aud.subject}</p>
                      <p className="text-xs text-cream/40">{aud.requesterName}</p>
                    </div>
                    <StatusBadge status={aud.status} />
                  </Link>
                )) : (
                  <p className="text-sm text-cream/40 py-4 text-center">Aucune demande prioritaire</p>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Notifications feed */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-military-400" />
                  Activité live
                </CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {MOCK_NOTIFICATIONS.map((n) => (
                  <div key={n.id} className={`p-3 rounded-xl border ${n.isRead ? 'bg-carbon-900/50 border-carbon-800' : 'bg-military-900/20 border-military-700/30'}`}>
                    <p className="text-sm font-medium text-cream">{n.title}</p>
                    <p className="text-xs text-cream/40 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Mini calendar + today */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold-400" />
                Audiences planifiées
              </CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {today.length ? today.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-carbon-800/40">
                  <div className="text-center px-3 py-2 rounded-lg bg-military-900/50 border border-military-700/30">
                    <p className="text-xs text-cream/40">Date</p>
                    <p className="text-sm font-bold text-gold-400">{formatDateShort(a.scheduledAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{a.subject}</p>
                    <p className="text-xs text-cream/40">{a.room?.name ?? 'Salle à confirmer'}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-cream/40">Aucune audience planifiée aujourd&apos;hui</p>
              )}
            </div>
          </Card>

          <Card glow>
            <CardHeader>
              <CardTitle>Timeline récente</CardTitle>
            </CardHeader>
            <div className="relative pl-6 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-military-700/30">
              {audiences.slice(0, 3).length ? audiences.slice(0, 3).map((item) => (
                <div key={item.id} className="relative">
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-military-600 border-2 border-carbon-900" />
                  <p className="text-sm text-cream">{item.subject}</p>
                  <p className="text-xs text-military-400 font-mono">{item.reference}</p>
                  <p className="text-[10px] text-cream/30 mt-0.5">{formatDateShort(item.createdAt)}</p>
                </div>
              )) : (
                <p className="text-sm text-cream/40">Aucune activité récente</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
