'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, FileText, Calendar, CheckCircle2, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import { isConsultationAudience } from '@/lib/audience-utils';
import { useAudiencesStore } from '@/stores/audiences-store';

export function ConsultationView() {
  const audiences = useAudiencesStore((s) => s.audiences);
  const [search, setSearch] = useState('');

  const visible = audiences.filter(isConsultationAudience);
  const filtered = visible.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.reference.toLowerCase().includes(q) ||
      a.subject.toLowerCase().includes(q) ||
      a.requesterName.toLowerCase().includes(q)
    );
  });

  const planned = visible.filter((a) => ['PLANIFIEE', 'CONFIRMEE'].includes(a.status));
  const completed = visible.filter((a) => ['TERMINEE', 'REJETEE'].includes(a.status));
  const active = visible.filter((a) => !['TERMINEE', 'REJETEE', 'ARCHIVEE'].includes(a.status));

  const statCards = [
    { label: 'Audiences actives', value: active.length, icon: FileText, tone: 'text-cream/70' },
    { label: 'Planifiées', value: planned.length, icon: Calendar, tone: 'text-blue-400' },
    { label: 'Clôturées', value: completed.length, icon: CheckCircle2, tone: 'text-military-400' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] relative noise-overlay">
      <div className="absolute inset-0 bg-gradient-to-b from-carbon-950 via-carbon-900/50 to-carbon-950 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cream/10 to-transparent" />

      <div className="relative z-10 p-4 lg:p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-cream/5 pb-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-carbon-900 flex items-center justify-center border border-cream/10">
              <Eye className="w-7 h-7 text-cream/60" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-[0.2em] text-cream uppercase font-display">
                Consultation
              </h1>
              <p className="text-[10px] text-cream/40 font-mono uppercase tracking-widest mt-1">
                Vue en lecture seule — suivi des audiences
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-cream/5 bg-carbon-900/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('p-1.5 rounded-lg bg-carbon-950/60', stat.tone)}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-cream/30">{stat.label}</span>
                </div>
                <p className={cn('text-3xl font-black font-display', stat.tone)}>
                  {String(stat.value).padStart(2, '0')}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="border-cream/5">
          <CardHeader className="border-b border-cream/5 pb-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-3 text-cream/80">
                  <FileText className="w-5 h-5" />
                  Registre des audiences
                </CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider mt-1">
                  Consultation sans action — {filtered.length} audience(s)
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="pl-10 pr-4 py-2 rounded-xl bg-carbon-900/50 border border-cream/10 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-cream/20 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <div className="space-y-2">
            {filtered.length ? (
              filtered.slice(0, 30).map((aud) => (
                <Link
                  key={aud.id}
                  href={`/audiences/${aud.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl hover:bg-carbon-900/40 border border-transparent hover:border-cream/5 transition-all group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-cream/40">{aud.reference}</span>
                      <PriorityBadge priority={aud.priority} className="scale-75 origin-left" />
                    </div>
                    <p className="text-sm font-medium text-cream/80 group-hover:text-cream truncate">{aud.subject}</p>
                    <p className="text-[10px] text-cream/30 mt-1">{aud.requesterName}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {aud.scheduledAt ? (
                      <span className="text-[10px] font-mono text-cream/30 hidden sm:block">{formatDate(aud.scheduledAt)}</span>
                    ) : null}
                    <StatusBadge status={aud.status} className="scale-90" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-16 text-center border border-dashed border-cream/10 rounded-2xl opacity-40">
                <p className="font-mono text-xs uppercase tracking-[0.2em]">Aucune audience trouvée</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
