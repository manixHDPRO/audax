'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Radio,
  Activity,
  AlertTriangle,
  DoorOpen,
  Clock,
  Zap,
  Shield,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { MOCK_ROOMS } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import { useAuthStore, canAccessCommandCenter } from '@/stores/auth-store';
import { useAudiencesStore } from '@/stores/audiences-store';
import { useRouter } from 'next/navigation';

const roomStatusColors = {
  LIBRE: 'bg-military-500/20 text-military-400 border-military-500/30',
  OCCUPEE: 'bg-red-900/30 text-red-400 border-red-700/30',
  RESERVEE: 'bg-amber-900/30 text-amber-400 border-amber-700/30',
  MAINTENANCE: 'bg-carbon-700 text-cream/40 border-carbon-600',
};

export default function CommandCenterPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (user && !canAccessCommandCenter(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const p = setInterval(() => setPulse((v) => v + 1), 5000);
    return () => { clearInterval(t); clearInterval(p); };
  }, []);

  const audiences = useAudiencesStore((s) => s.audiences);
  const critical = audiences.filter((a) => a.priority === 'CRITIQUE');
  const pending = audiences.filter((a) => ['EN_ATTENTE', 'EN_ANALYSE'].includes(a.status));
  const scheduled = audiences.filter((a) => a.scheduledAt);
  const activeTotal = audiences.filter((a) => !['TERMINEE', 'REJETEE'].includes(a.status)).length;

  return (
    <AuthGuard>
      <div className="min-h-[calc(100vh-4rem)] relative scanlines">
        {/* Full-screen command atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-military-950/40 via-carbon-950 to-carbon-950 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-military-500/50 to-transparent" />

        <div className="relative z-10 p-4 lg:p-6 space-y-6">
          {/* Header bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ boxShadow: ['0 0 20px rgba(74,124,74,0.2)', '0 0 40px rgba(74,124,74,0.4)', '0 0 20px rgba(74,124,74,0.2)'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-xl bg-military-800 flex items-center justify-center border border-military-500/40"
              >
                <Radio className="w-6 h-6 text-gold-400" />
              </motion.div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold tracking-[0.15em] text-cream uppercase">
                  Command Center
                </h1>
                <p className="text-xs text-military-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Supervision temps réel — LIVE
                </p>
              </div>
            </div>

            <div className="font-mono text-2xl lg:text-3xl text-gold-400 tabular-nums glow-gold px-4 py-2 rounded-xl glass">
              {time.toLocaleTimeString('fr-FR')}
            </div>
          </div>

          {/* Critical KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total actif', value: activeTotal, icon: Activity },
              { label: 'En attente', value: pending.filter((a) => a.status === 'EN_ATTENTE').length, icon: Clock },
              { label: 'En analyse', value: pending.filter((a) => a.status === 'EN_ANALYSE').length, icon: Shield },
              { label: 'Critiques', value: critical.length, icon: AlertTriangle, critical: true },
              { label: 'Planifiées', value: audiences.filter((a) => a.status === 'PLANIFIEE').length, icon: Zap },
              { label: 'Salles libres', value: MOCK_ROOMS.filter((r) => r.status === 'LIBRE').length, icon: DoorOpen },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`glass rounded-xl p-4 ${kpi.critical ? 'glow-critical border-red-800/30' : 'glow-green'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`w-4 h-4 ${kpi.critical ? 'text-red-400' : 'text-military-400'}`} />
                  <span className="text-[10px] uppercase tracking-wider text-cream/40">{kpi.label}</span>
                </div>
                <p className={`text-2xl font-bold ${kpi.critical ? 'text-red-400' : 'text-cream'}`}>{kpi.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-12 gap-4">
            {/* Critical audiences spotlight */}
            <div className="lg:col-span-5 glass-strong rounded-2xl p-5 glow-gold border border-gold-500/10">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gold-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Audiences prioritaires
              </h2>
              <div className="space-y-3">
                {critical.map((aud, i) => (
                  <motion.div
                    key={aud.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="p-4 rounded-xl bg-red-950/20 border border-red-800/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-red-400">{aud.reference}</span>
                      <PriorityBadge priority={aud.priority} />
                      <StatusBadge status={aud.status} />
                    </div>
                    <p className="font-semibold text-cream">{aud.subject}</p>
                    <p className="text-xs text-cream/40 mt-1">{aud.motive}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Live feed */}
            <div className="lg:col-span-4 glass rounded-2xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-military-400 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Feed opérationnel
              </h2>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {(audiences.length
                  ? audiences.slice(0, 5).map((a) => ({
                      msg: `Demande enregistrée — ${a.reference}`,
                      time: new Date(a.createdAt).toLocaleTimeString('fr-FR'),
                      type: a.priority === 'CRITIQUE' ? 'warn' : 'info',
                    }))
                  : [{ msg: 'Aucune activité audience', time: time.toLocaleTimeString('fr-FR'), type: 'info' }]
                ).map((ev, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    className="flex gap-3 p-2 rounded-lg hover:bg-carbon-800/50 text-xs font-mono"
                  >
                    <span className="text-cream/30 shrink-0">{ev.time}</span>
                    <span className={ev.type === 'warn' ? 'text-amber-400' : ev.type === 'ok' ? 'text-military-400' : 'text-cream/60'}>
                      {ev.msg}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Room status */}
            <div className="lg:col-span-3 glass rounded-2xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-military-400 mb-4 flex items-center gap-2">
                <DoorOpen className="w-4 h-4" />
                État des salles
              </h2>
              <div className="space-y-3">
                {MOCK_ROOMS.map((room) => (
                  <div key={room.id} className="p-3 rounded-xl bg-carbon-800/40">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{room.name}</p>
                        <p className="text-[10px] text-cream/40">Étage {room.floor} · {room.capacity} places</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${roomStatusColors[room.status]}`}>
                        {room.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Validations monitoring */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-military-400 mb-4">
              Validations en cours
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pending.map((aud) => (
                <div key={aud.id} className="flex items-center gap-3 p-3 rounded-xl bg-carbon-800/30 border border-military-800/20">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-military-400">{aud.reference}</p>
                    <p className="text-sm truncate">{aud.subject}</p>
                  </div>
                  <StatusBadge status={aud.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic agenda strip */}
          <div className="glass rounded-2xl p-5 overflow-x-auto">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gold-400 mb-4">Agenda dynamique</h2>
            <div className="flex gap-4 min-w-max">
              {scheduled.length ? scheduled.map((a) => (
                <div key={a.id} className="w-64 p-4 rounded-xl bg-military-900/30 border border-military-700/20 glow-green">
                  <p className="text-xs text-gold-400">{formatDate(a.scheduledAt)}</p>
                  <p className="font-medium mt-1">{a.subject}</p>
                  <p className="text-xs text-cream/40 mt-1">{a.room?.name ?? 'Salle à confirmer'}</p>
                </div>
              )) : (
                <p className="text-sm text-cream/40">Aucune audience planifiée</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
