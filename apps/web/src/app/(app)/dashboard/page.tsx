'use client';

import { useEffect } from 'react';
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
  Shield,
  Users,
  Layers,
  Archive,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { formatDateShort, cn } from '@/lib/utils';
import { isApiConfigured } from '@/lib/api-config';
import {
  isCemgCabinetHistoryAudience,
  isCemgPilotageAudience,
  getCommandDashboardMetricsPool,
  getCommandDashboardStatCounts,
  getAdminAudienceOverviewStats,
  getAdminOperationalAudiences,
} from '@/lib/audience-utils';
import { useAudiencesStore } from '@/stores/audiences-store';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const audiences = useAudiencesStore((s) => s.audiences);
  const isSyncing = useAudiencesStore((s) => s.isSyncing);
  const lastSyncedAt = useAudiencesStore((s) => s.lastSyncedAt);
  const syncFromApi = useAudiencesStore((s) => s.syncFromApi);
  const { user, accessToken } = useAuthStore();
  const role = user?.role;
  const isCemg = role === 'CEMG';
  const isAdmin = role === 'ADMIN';
  const isChef = role === 'CHEF';
  const showPriorite0Section = isAdmin || isCemg || role === 'PROTOCOL';
  const adminOverview = isAdmin ? getAdminAudienceOverviewStats(audiences) : null;

  useEffect(() => {
    if (!accessToken || !isApiConfigured()) return;

    let cancelled = false;
    const run = async (attempt = 0) => {
      const ok = await syncFromApi(accessToken, { silent: attempt > 0 });
      if (cancelled || ok || attempt >= 3) return;
      window.setTimeout(() => void run(attempt + 1), 1500);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, syncFromApi]);

  const metricsPool = getCommandDashboardMetricsPool(audiences, role);
  const stats = getCommandDashboardStatCounts(audiences, role);
  const pilotageAudiences = isAdmin
    ? audiences
    : isCemg
      ? audiences.filter((a) => isCemgPilotageAudience(a, 'CEMG'))
      : metricsPool;
  const cemgHistory = isCemg
    ? audiences.filter((a) => isCemgCabinetHistoryAudience(a, user?.role))
    : [];

  const statCards = isAdmin && adminOverview
    ? [
        { label: 'Total audiences', value: adminOverview.total, icon: Layers, color: 'text-cream', glow: false },
        { label: 'En cours', value: adminOverview.active, icon: Activity, color: 'text-military-400', glow: adminOverview.active > 0 },
        { label: 'En attente', value: adminOverview.pending, icon: Clock, color: 'text-amber-400', glow: adminOverview.pending > 0 },
        { label: 'Validées', value: adminOverview.validated, icon: CheckCircle2, color: 'text-military-300', glow: adminOverview.validated > 0 },
        { label: 'Terminées', value: adminOverview.completed, icon: Archive, color: 'text-cream/60', glow: false },
      ]
    : [
        { label: 'En attente', value: stats.pending, icon: Clock, color: 'text-amber-400', glow: stats.pending > 0 },
        { label: 'En analyse', value: stats.inAnalysis, icon: Activity, color: 'text-blue-400', glow: false },
        { label: 'Validées', value: stats.validated, icon: CheckCircle2, color: 'text-military-400', glow: false },
        { label: 'Critiques', value: stats.critical, icon: AlertTriangle, color: 'text-red-400', glow: stats.critical > 0 },
      ];

  const isToday = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.toLocaleDateString('fr-FR') === now.toLocaleDateString('fr-FR');
  };

  const operationTime = (aud: typeof audiences[number]) =>
    new Date(aud.scheduledAt ?? aud.createdAt).getTime();

  const visibleAudiences = isAdmin
    ? getAdminOperationalAudiences(audiences)
    : metricsPool.filter((a) =>
        ['EN_ATTENTE', 'DEJA_ENVOYE', 'EN_ANALYSE', 'PLANIFIEE', 'VALIDEE', 'CONFIRMEE'].includes(a.status),
      );
  const priority0 = showPriorite0Section
    ? visibleAudiences.filter((a) => a.priority === 'PRIORITE_0')
    : [];
  const otherAudiences = visibleAudiences.filter((a) => a.priority !== 'PRIORITE_0');

  /** Opérations du jour : périmètre pilotage / métriques du rôle. */
  const todayOperations = pilotageAudiences
    .filter((a) => isToday(a.createdAt) || (a.scheduledAt && isToday(a.scheduledAt)))
    .sort((a, b) => operationTime(a) - operationTime(b));

  const today = pilotageAudiences.filter((a) => a.scheduledAt && isToday(a.scheduledAt));

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8 noise-overlay">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-military-600 pl-6 py-2"
        >
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-cream tracking-tight uppercase font-display">
              {isAdmin ? (
                <>Vue d&apos;ensemble <span className="text-military-500">Administration</span></>
              ) : (
                <>Command <span className="text-military-500">Dashboard</span></>
              )}
            </h1>
            <p className="text-military-400/60 mt-1 font-mono text-xs tracking-[0.2em] uppercase">
              {isAdmin
                ? 'Situation générale — l\'ensemble des audiences du système'
                : 'Système de Gestion Stratégique — Cabinet Chef EMG'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-cream/40 font-mono text-xs uppercase tracking-wider">
              {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
            </p>
            <p className="text-military-500 font-mono text-[10px] mt-1">STATUS: OPERATIONNEL // SECURE_LINK: ACTIVE</p>
          </div>
        </motion.div>

        {/* KPI Grid */}
        <div className={cn('grid gap-6', isAdmin ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4')}>
          {isSyncing && !lastSyncedAt ? (
            <div className="col-span-full py-8 text-center text-cream/40 text-sm font-mono uppercase tracking-widest">
              Chargement des indicateurs…
            </div>
          ) : (
          statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                glow={stat.glow}
                tactical
                className="relative group hover:border-military-500/50 transition-all duration-500"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-military-500 uppercase tracking-[0.2em] font-mono font-bold">{stat.label}</p>
                    <p className="text-4xl font-bold mt-2 text-cream font-display tracking-tighter">{stat.value}</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl bg-carbon-800/50 border border-military-800/50 group-hover:border-military-500/30 transition-colors",
                    stat.color
                  )}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-carbon-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '65%' }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                      className={cn("h-full bg-current opacity-50", stat.color)}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-cream/20">LIVE</span>
                </div>
              </Card>
            </motion.div>
          )))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Tactical Priorities - Split into Priority 0 and Others */}
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card tactical scanlines className="h-full flex flex-col">
              <CardHeader className="flex-row items-center justify-between border-b border-military-800/50 pb-4 mb-6">
                <div>
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="w-2 h-6 bg-military-500 rounded-full animate-pulse" />
                    {isAdmin ? 'Audiences en cours — tous circuits' : 'Audiences en Attente / Réprogrammées'}
                  </CardTitle>
                  <CardDescription className="font-mono text-[10px] uppercase tracking-wider mt-1">
                    {isAdmin
                      ? `${adminOverview?.active ?? 0} actives sur ${adminOverview?.total ?? 0} audiences enregistrées`
                      : 'Supervision des audiences prioritaires et planifiées'}
                  </CardDescription>
                </div>
                <Link href="/audiences" className="px-4 py-2 rounded-lg glass border-military-700/30 text-[10px] font-bold text-military-400 hover:text-military-300 hover:border-military-500 transition-all uppercase tracking-widest flex items-center gap-2">
                  Tout voir <ArrowRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              
              <div className={cn('grid gap-8 flex-1', showPriorite0Section ? 'md:grid-cols-2' : 'grid-cols-1')}>
                {showPriorite0Section ? (
                /* Column 1: Priority 0 */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                    <h3 className="text-xs font-mono font-bold text-gold-500 uppercase tracking-[0.2em]">Priorité 0</h3>
                  </div>
                  <div className="space-y-3">
                    {priority0.length ? priority0.map((aud) => (
                      <Link
                        key={aud.id}
                        href={`/audiences/${aud.id}`}
                        className="flex flex-col p-4 rounded-xl bg-gold-500/5 hover:bg-gold-500/10 border border-gold-500/20 hover:border-gold-500/40 transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-gold-500 bg-gold-950/50 px-2 py-0.5 rounded border border-gold-500/30">{aud.reference}</span>
                          <StatusBadge status={aud.status} className="scale-75 origin-right" />
                        </div>
                        <p className="text-sm font-bold text-cream group-hover:text-white transition-colors line-clamp-1">{aud.subject}</p>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-[10px] text-cream/40 flex items-center gap-1.5">
                            <Users className="w-3 h-3" /> {aud.requesterName}
                          </p>
                          <p className="text-[10px] text-cream/40 font-mono italic">
                            {formatDateShort(aud.createdAt)}
                          </p>
                        </div>
                      </Link>
                    )) : (
                      <div className="py-8 text-center border border-dashed border-military-800/30 rounded-xl opacity-20">
                        <p className="text-[10px] font-mono uppercase tracking-widest">Aucune audience P0</p>
                      </div>
                    )}
                  </div>
                </div>
                ) : null}

                {/* Autres audiences */}
                <div className={cn('space-y-4', showPriorite0Section && 'border-l border-military-800/30 pl-8')}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-military-500" />
                    <h3 className="text-xs font-mono font-bold text-military-500 uppercase tracking-[0.2em]">
                      {showPriorite0Section ? 'Autres Audiences' : isChef ? 'Audiences du Cabinet' : 'Autres Audiences'}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {otherAudiences.length ? otherAudiences.map((aud) => (
                      <Link
                        key={aud.id}
                        href={`/audiences/${aud.id}`}
                        className="flex flex-col p-4 rounded-xl bg-carbon-800/30 hover:bg-military-900/20 border border-military-800/30 hover:border-military-600/50 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-military-500 bg-military-950 px-2 py-0.5 rounded border border-military-800/50">{aud.reference}</span>
                          <div className="flex items-center gap-2">
                            <PriorityBadge priority={aud.priority} className="scale-75 origin-right" />
                            <StatusBadge status={aud.status} className="scale-75 origin-right" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-cream group-hover:text-white transition-colors line-clamp-1">{aud.subject}</p>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-[10px] text-cream/40 flex items-center gap-1.5">
                            <Users className="w-3 h-3" /> {aud.requesterName}
                          </p>
                          <p className="text-[10px] text-cream/40 font-mono italic">
                            {formatDateShort(aud.createdAt)}
                          </p>
                        </div>
                      </Link>
                    )) : (
                      <div className="py-8 text-center border border-dashed border-military-800/30 rounded-xl opacity-20">
                        <p className="text-[10px] font-mono uppercase tracking-widest">Aucune autre audience</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {isCemg && cemgHistory.length ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card tactical className="border-military-800/40">
                <CardHeader className="border-b border-military-800/50 pb-4 mb-6">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <Shield className="w-5 h-5 text-military-500" />
                    Historique — Délégations au Cabinet
                  </CardTitle>
                  <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                    Audiences transmises au Chef de Cabinet — consultation et traçabilité
                  </CardDescription>
                </CardHeader>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {cemgHistory.slice(0, 12).map((aud) => (
                    <Link
                      key={aud.id}
                      href={`/audiences/${aud.id}`}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl bg-carbon-800/30 border border-military-800/30 hover:border-military-600/40 transition-all group"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-military-500">{aud.reference}</p>
                        <p className="text-sm font-medium text-cream group-hover:text-white truncate">{aud.subject}</p>
                        <p className="text-[10px] text-cream/40 mt-1">{aud.requesterName}</p>
                      </div>
                      <StatusBadge status={aud.status} className="scale-75 origin-right shrink-0" />
                    </Link>
                  ))}
                </div>
              </Card>
            </motion.div>
          ) : null}

          {/* Timeline des opérations */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card tactical glow className="h-full flex flex-col">
              <CardHeader className="border-b border-military-800/50 pb-4 mb-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-military-500" />
                  Timeline des Opérations
                </CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                  Aujourd&apos;hui // {todayOperations.length} événements
                </CardDescription>
              </CardHeader>
              <div className="relative pl-8 space-y-6 flex-1 overflow-auto max-h-[500px] pr-2 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-military-600 before:via-military-800 before:to-transparent">
                {todayOperations.length ? todayOperations.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="relative group"
                  >
                    <div className="absolute -left-[29px] top-1 w-5 h-5 rounded-full bg-carbon-950 border-2 border-military-600 flex items-center justify-center z-10 group-hover:border-gold-500 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-military-500 group-hover:bg-gold-500 animate-pulse" />
                    </div>
                    <Link
                      href={`/audiences/${item.id}`}
                      className="block bg-carbon-800/30 p-4 rounded-xl border border-military-800/20 group-hover:border-military-700/50 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-cream group-hover:text-military-300 transition-colors line-clamp-1">{item.subject}</p>
                        <span className="text-[10px] font-mono text-gold-500 font-bold shrink-0 ml-2">
                          {new Date(item.scheduledAt ?? item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-military-400 font-mono tracking-wider">{item.reference}</p>
                        <div className="flex items-center gap-2">
                          {!item.scheduledAt && isToday(item.createdAt) ? (
                            <span className="text-[9px] uppercase tracking-wider text-cream/40">Enregistré</span>
                          ) : null}
                          <StatusBadge status={item.status} className="scale-75 origin-right" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )) : (
                  <div className="py-12 text-center border border-dashed border-military-900/30 rounded-2xl opacity-20">
                    <p className="text-xs font-mono uppercase tracking-[0.2em]">Aucune opération aujourd&apos;hui</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Planification */}
        <Card tactical scanlines>
            <CardHeader className="flex-row items-center justify-between border-b border-military-800/50 pb-4 mb-6">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Calendar className="w-5 h-5 text-gold-400" />
                Planification Stratégique
              </CardTitle>
              <span className="text-[10px] font-mono text-military-500">J-0 // {today.length} ENGAGEMENTS</span>
            </CardHeader>
            <div className="grid gap-4">
              {today.length ? today.map((a) => (
                <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl bg-carbon-800/40 border border-military-800/30 group hover:border-military-600/50 transition-all">
                  <div className="text-center min-w-[80px] px-3 py-3 rounded-xl bg-military-950 border border-military-800/50 group-hover:border-gold-500/30 transition-colors">
                    <p className="text-[10px] text-military-500 font-mono uppercase tracking-tighter">Heure</p>
                    <p className="text-lg font-bold text-gold-400 font-display">{formatDateShort(a.scheduledAt)}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-cream">{a.subject}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-military-500 flex items-center gap-1.5">
                        <Shield className="w-3 h-3" /> {a.room?.name ?? 'Zone à confirmer'}
                      </p>
                      <div className="w-1 h-1 rounded-full bg-military-800" />
                      <p className="text-xs text-cream/40 uppercase tracking-widest font-mono text-[10px]">{a.confidentiality}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center border-2 border-dashed border-military-900/50 rounded-2xl">
                  <p className="text-sm text-cream/20 font-mono uppercase tracking-[0.2em]">Aucun engagement planifié</p>
                </div>
              )}
            </div>
          </Card>
      </div>
    </AuthGuard>
  );
}
