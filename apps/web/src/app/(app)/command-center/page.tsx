'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Radio,
  Activity,
  AlertTriangle,
  DoorOpen,
  Clock,
  Zap,
  Shield,
  Users,
  Calendar,
  Layers,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { formatDate, cn } from '@/lib/utils';
import { isApiConfigured } from '@/lib/api-config';
import { listRoomsApi, type RoomApiRecord } from '@/lib/api-client';
import {
  getAdminAudienceOverviewStats,
  getAdminOperationalAudiences,
} from '@/lib/audience-utils';
import { useAuthStore, canAccessAdminCommandCenter, canAccessCabinetMonitoring, canAccessCemgMonitoring, getDefaultAppRoute } from '@/stores/auth-store';
import { useAudiencesStore } from '@/stores/audiences-store';
import { useRouter } from 'next/navigation';

const roomStatusColors = {
  LIBRE: 'bg-military-500/20 text-military-400 border-military-500/30',
  OCCUPEE: 'bg-red-900/30 text-red-400 border-red-700/30',
  RESERVEE: 'bg-amber-900/30 text-amber-400 border-amber-700/30',
  MAINTENANCE: 'bg-carbon-700 text-cream/40 border-carbon-600',
};

export default function CommandCenterPage() {
  const { user, permissions, accessToken } = useAuthStore();
  const router = useRouter();
  const syncFromApi = useAudiencesStore((s) => s.syncFromApi);
  const [time, setTime] = useState(new Date());
  const [pulse, setPulse] = useState(0);
  const [rooms, setRooms] = useState<RoomApiRecord[]>([]);

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

  useEffect(() => {
    if (!accessToken || !isApiConfigured()) return;

    let cancelled = false;
    void listRoomsApi(accessToken)
      .then((data) => {
        if (!cancelled) setRooms(data);
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!user) return;

    if (canAccessCemgMonitoring(user.role, permissions)) {
      router.replace('/cemg-monitoring');
      return;
    }

    if (canAccessCabinetMonitoring(user.role, permissions)) {
      router.replace('/cabinet-monitoring');
      return;
    }

    if (!canAccessAdminCommandCenter(user.role, permissions)) {
      router.replace(getDefaultAppRoute(user.role, permissions));
    }
  }, [user, permissions, router]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const p = setInterval(() => setPulse((v) => v + 1), 5000);
    return () => { clearInterval(t); clearInterval(p); };
  }, []);

  const audiences = useAudiencesStore((s) => s.audiences);
  const overview = getAdminAudienceOverviewStats(audiences);
  const operational = getAdminOperationalAudiences(audiences);
  const critical = operational.filter((a) => a.priority === 'CRITIQUE' || a.priority === 'PRIORITE_0');
  const pending = audiences.filter((a) =>
    ['EN_ATTENTE', 'DEJA_ENVOYE', 'EN_ANALYSE', 'TRANSMIS_DIRCAB'].includes(a.status),
  );
  const scheduled = audiences.filter((a) => a.scheduledAt);
  const recentAudiences = [...audiences].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const kpis = [
    { label: 'Total', value: overview.total, icon: Layers, glow: true },
    { label: 'En cours', value: overview.active, icon: Activity },
    { label: 'En attente', value: overview.pending, icon: Clock },
    { label: 'Validées', value: overview.validated, icon: CheckCircle2 },
    { label: 'Terminées', value: overview.completed, icon: Archive },
    { label: 'Critiques / P0', value: overview.critical + overview.priority0, icon: AlertTriangle, critical: overview.critical + overview.priority0 > 0 },
  ];

  if (!canAccessAdminCommandCenter(user?.role, permissions)) return null;

  return (
    <AuthGuard>
      <div className="min-h-[calc(100vh-4rem)] relative noise-overlay">
        {/* Full-screen command atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-military-950/60 via-carbon-950 to-carbon-950 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-military-500/50 to-transparent" />

        <div className="relative z-10 p-4 lg:p-8 space-y-8">
          {/* Header bar */}
          <div className="flex flex-wrap items-center justify-between gap-6 border-b border-military-800/30 pb-6">
            <div className="flex items-center gap-6">
              <motion.div
                animate={{ 
                  boxShadow: ['0 0 20px rgba(74,124,74,0.2)', '0 0 40px rgba(74,124,74,0.5)', '0 0 20px rgba(74,124,74,0.2)'],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-military-700 to-military-900 flex items-center justify-center border border-military-500/50 glow-green-strong"
              >
                <Radio className="w-7 h-7 text-gold-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black tracking-[0.3em] text-cream uppercase font-display">
                  Command <span className="text-military-500">Center</span>
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[10px] text-military-400 font-mono flex items-center gap-2 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    Transmission Live Active
                  </p>
                  <span className="text-[10px] text-military-800 font-mono">//</span>
                <p className="text-[10px] text-military-600 font-mono uppercase tracking-widest">
                  Vue globale — {overview.total} audiences // {overview.active} actives
                </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end mr-4">
                <span className="text-[9px] font-mono text-military-500 uppercase tracking-widest">Local Time</span>
                <span className="text-xs font-mono text-cream/40 uppercase">{new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</span>
              </div>
              <div className="font-mono text-3xl lg:text-4xl text-gold-400 tabular-nums glow-gold px-6 py-3 rounded-2xl glass-strong border border-military-800/50 shadow-2xl">
                {time.toLocaleTimeString('fr-FR')}
              </div>
            </div>
          </div>

          {/* Critical KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "glass rounded-2xl p-5 border transition-all duration-500 group relative overflow-hidden",
                  kpi.critical 
                    ? 'glow-critical border-red-900/40 bg-red-950/10' 
                    : 'border-military-800/30 hover:border-military-600/50'
                )}
              >
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <kpi.icon className="w-12 h-12 -mr-4 -mt-4 rotate-12" />
                </div>
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    kpi.critical ? "bg-red-950/50 text-red-400" : "bg-military-950/50 text-military-500"
                  )}>
                    <kpi.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-cream/40">{kpi.label}</span>
                </div>
                <p className={cn(
                  "text-3xl font-black font-display tracking-tight relative z-10",
                  kpi.critical ? 'text-red-400' : 'text-cream'
                )}>{kpi.value.toString().padStart(2, '0')}</p>
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5 opacity-30",
                  kpi.critical ? "bg-red-500" : "bg-military-500"
                )} />
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Critical audiences spotlight */}
            <div className="lg:col-span-5 glass-strong rounded-3xl p-6 border border-gold-500/10 tactical-corners scanlines relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest font-bold">Alerte Priorité</span>
                </div>
              </div>
              <h2 className="text-base font-black uppercase tracking-[0.2em] text-gold-400 mb-6 flex items-center gap-3 font-display">
                <AlertTriangle className="w-5 h-5" />
                Audiences Prioritaires
              </h2>
              <div className="space-y-4">
                {critical.length ? critical.map((aud, i) => (
                  <motion.div
                    key={aud.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="p-5 rounded-2xl bg-red-950/10 border border-red-900/20 hover:border-red-500/30 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-red-500 bg-red-950/50 px-2 py-0.5 rounded border border-red-900/30">{aud.reference}</span>
                        <PriorityBadge priority={aud.priority} />
                      </div>
                      <StatusBadge status={aud.status} />
                    </div>
                    <p className="text-lg font-bold text-cream group-hover:text-white transition-colors">{aud.subject}</p>
                    <p className="text-xs text-cream/40 mt-2 leading-relaxed italic">{aud.motive}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-900/20 flex items-center justify-center text-[10px] font-bold text-red-400 border border-red-800/30">
                          {aud.requesterName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-xs text-cream/60 font-medium">{aud.requesterName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-red-900 uppercase font-bold tracking-widest">Action Requise</span>
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-20 flex flex-col items-center justify-center opacity-20">
                    <Shield className="w-16 h-16 mb-4" />
                    <p className="font-mono text-xs uppercase tracking-[0.3em]">Secteur Sécurisé</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live feed */}
            <div className="lg:col-span-4 glass rounded-3xl p-6 border border-military-800/30 flex flex-col">
              <h2 className="text-base font-black uppercase tracking-[0.2em] text-military-400 mb-6 flex items-center gap-3 font-display">
                <Activity className="w-5 h-5" />
                Feed Opérationnel
              </h2>
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {(recentAudiences.length
                  ? recentAudiences.slice(0, 12).map((a) => ({
                      msg: `${a.reference} — ${a.requesterName} (${a.status})`,
                      time: new Date(a.createdAt).toLocaleTimeString('fr-FR'),
                      type: a.priority === 'CRITIQUE' || a.priority === 'PRIORITE_0' ? 'warn' : 'info',
                      id: a.id,
                      ref: a.reference,
                    }))
                  : [{ msg: 'Aucune activité audience', time: time.toLocaleTimeString('fr-FR'), type: 'info', id: 'none', ref: '---' }]
                ).map((ev, i) => (
                  <motion.div
                    key={`${ev.id}-${i}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex flex-col gap-1 p-3 rounded-xl hover:bg-military-900/20 border border-transparent hover:border-military-800/30 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-military-600 font-bold uppercase tracking-widest">T+{i*8}m // {ev.ref}</span>
                      <span className="text-[9px] font-mono text-cream/20">{ev.time}</span>
                    </div>
                    <span className={cn(
                      "text-xs font-mono transition-colors",
                      ev.type === 'warn' ? 'text-amber-400 group-hover:text-amber-300' : 'text-cream/60 group-hover:text-military-400'
                    )}>
                      {ev.msg}
                    </span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-military-900/50 flex justify-between items-center">
                <span className="text-[8px] font-mono text-military-700 uppercase tracking-widest">Transmission Cryptée</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full bg-military-600 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Room status */}
            <div className="lg:col-span-3 glass rounded-3xl p-6 border border-military-800/30">
              <h2 className="text-base font-black uppercase tracking-[0.2em] text-military-400 mb-6 flex items-center gap-3 font-display">
                <DoorOpen className="w-5 h-5" />
                État des Salles
              </h2>
              <div className="space-y-4">
                {rooms.length === 0 ? (
                  <p className="text-sm text-cream/40 py-6 text-center">Aucune salle configurée.</p>
                ) : (
                  rooms.map((room) => (
                  <div key={room.id} className="p-4 rounded-2xl bg-carbon-900/50 border border-military-800/20 hover:border-military-700/50 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-bold text-cream group-hover:text-military-300 transition-colors">{room.name}</p>
                        <p className="text-[9px] font-mono text-military-600 uppercase tracking-widest mt-0.5">
                          {room.floor ? `Niveau ${room.floor}` : 'Niveau —'} // SEC_ZONE_{room.id.slice(0, 2)}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[8px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-widest",
                        roomStatusColors[room.status]
                      )}>
                        {room.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(room.capacity, 3))].map((_, i) => (
                          <div key={i} className="w-5 h-5 rounded-md bg-military-800 border border-carbon-950 flex items-center justify-center">
                            <Users className="w-2.5 h-2.5 text-military-400" />
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-cream/20">{room.capacity} PLACES</span>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Validations monitoring */}
          <div className="glass-strong rounded-3xl p-8 border border-military-800/30 tactical-corners">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-black uppercase tracking-[0.2em] text-military-400 font-display">
                Audiences en cours de traitement
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-military-600 uppercase tracking-widest">
                  {pending.length} audience(s) — tous circuits
                </span>
                <Link
                  href="/audiences"
                  className="text-[10px] font-mono text-military-400 hover:text-military-300 uppercase tracking-widest"
                >
                  Voir toutes →
                </Link>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pending.length ? pending.map((aud) => (
                <Link
                  key={aud.id}
                  href={`/audiences/${aud.id}`}
                  className="flex flex-col gap-4 p-5 rounded-2xl bg-carbon-900/50 border border-military-800/30 hover:border-military-500/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-mono text-military-500 font-bold uppercase tracking-widest">{aud.reference}</p>
                    <p className="text-sm font-bold text-cream group-hover:text-military-300 transition-colors truncate">{aud.subject}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <StatusBadge status={aud.status} className="scale-90 origin-left" />
                    <div className="w-8 h-8 rounded-lg glass flex items-center justify-center group-hover:bg-military-700 transition-colors">
                      <Zap className="w-4 h-4 text-military-500 group-hover:text-gold-400" />
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-military-900/30 rounded-3xl">
                  <p className="font-mono text-xs text-military-800 uppercase tracking-[0.3em]">Aucune audience en attente de validation</p>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic agenda strip */}
          <div className="glass rounded-3xl p-8 border border-military-800/30 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-military-900/10 via-transparent to-military-900/10 pointer-events-none" />
            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-gold-400 mb-8 font-display flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              Agenda Dynamique
            </h2>
            <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
              {scheduled.length ? scheduled.map((a) => (
                <div key={a.id} className="min-w-[320px] p-6 rounded-2xl bg-military-900/20 border border-military-700/30 hover:border-gold-500/30 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gold-500/5 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-gold-500/10 transition-all" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="px-3 py-1.5 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 font-mono text-xs font-bold">
                      {formatDate(a.scheduledAt)}
                    </div>
                    <div className="h-px flex-1 bg-military-800/50" />
                  </div>
                  <p className="text-lg font-bold text-cream group-hover:text-gold-400 transition-colors mb-4">{a.subject}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-military-400">
                      <DoorOpen className="w-4 h-4" />
                      <span className="font-mono uppercase tracking-widest">{a.room?.name ?? 'Zone TBD'}</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-military-800" />
                    <span className="text-[10px] font-mono text-cream/30 uppercase tracking-widest">{a.confidentiality}</span>
                  </div>
                </div>
              )) : (
                <div className="w-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-military-900/30 rounded-3xl">
                  <p className="font-mono text-xs text-military-800 uppercase tracking-[0.3em]">Aucun engagement planifié</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
