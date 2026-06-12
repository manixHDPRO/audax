'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, AlertTriangle, GripVertical } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card } from '@/components/ui/card';
import { useCalendarStore, type CalendarEvent } from '@/stores/calendar-store';
import { cn, formatDateShort } from '@/lib/utils';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function DraggableEvent({ event, onDragStart }: { event: CalendarEvent; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/event-id', event.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      className="mt-0.5 px-1 py-0.5 rounded text-[9px] bg-military-700/70 border border-military-500/30 truncate cursor-grab active:cursor-grabbing flex items-center gap-0.5 hover:glow-green transition-all"
      title={`${event.reference} — Glisser pour replanifier`}
    >
      <GripVertical className="w-2 h-2 shrink-0 opacity-50" />
      <span className="truncate">{event.subject}</span>
    </div>
  );
}

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { events, conflicts, draggingId, setDragging, reschedule, getEventsForDay } = useCalendarStore();

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const handleDrop = (day: number) => {
    if (!draggingId) return;
    const hasConflict = reschedule(draggingId, new Date(year, month, day));
    setDragging(null);
    setDropTarget(null);
    setToast(hasConflict ? '⚠ Replanifié avec conflit horaire détecté' : '✓ Audience replanifiée');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Agenda intelligent</h1>
            <p className="text-sm text-cream/50 mt-1">Glissez-déposez les audiences pour replanifier</p>
          </div>
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm glass',
                  toast.includes('conflit') ? 'border border-amber-500/30 text-amber-400' : 'border border-military-500/30 text-military-400',
                )}
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCurrent(new Date(year, month - 1))} className="p-2 rounded-lg hover:bg-carbon-700 cursor-pointer">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
                <button onClick={() => setCurrent(new Date(year, month + 1))} className="p-2 rounded-lg hover:bg-carbon-700 cursor-pointer">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-xs text-cream/40 py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDay(year, month, day);
                  const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                  const isDropTarget = dropTarget === day;

                  return (
                    <motion.div
                      key={day}
                      onDragOver={(e) => { e.preventDefault(); setDropTarget(day); }}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(e) => { e.preventDefault(); handleDrop(day); }}
                      className={cn(
                        'aspect-square p-1 rounded-xl border transition-all min-h-[72px]',
                        isToday && 'border-military-500 bg-military-900/30 glow-green',
                        !isToday && 'border-carbon-700/50 bg-carbon-800/30',
                        isDropTarget && draggingId && 'border-gold-500 bg-gold-500/10 scale-[1.02] glow-gold',
                      )}
                    >
                      <span className={cn('text-xs', isToday ? 'text-gold-400 font-bold' : 'text-cream/60')}>{day}</span>
                      {dayEvents.map((e) => (
                        <DraggableEvent key={e.id} event={e} onDragStart={() => setDragging(e.id)} />
                      ))}
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className={cn(conflicts.length > 0 && 'glow-critical border-red-800/30')}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className={cn('w-4 h-4', conflicts.length ? 'text-red-400' : 'text-amber-400')} />
                Conflits détectés ({conflicts.length})
              </h3>
              {conflicts.length === 0 ? (
                <p className="text-xs text-cream/40">Aucun chevauchement horaire</p>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((c, i) => (
                    <div key={i} className="p-2 rounded-lg bg-red-950/20 border border-red-800/20 text-xs">
                      <p className="font-mono text-red-400">{c.eventA.reference} ↔ {c.eventB.reference}</p>
                      <p className="text-cream/50 mt-1 truncate">{c.eventA.subject}</p>
                      <p className="text-cream/50 truncate">{c.eventB.subject}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="text-sm font-semibold mb-3">Tous les créneaux</h3>
              {events.map((e) => (
                <div
                  key={e.id}
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData('text/event-id', e.id);
                    setDragging(e.id);
                  }}
                  className="p-2 rounded-lg bg-carbon-800/40 mb-2 text-sm cursor-grab active:cursor-grabbing hover:border-military-600/30 border border-transparent transition-all"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3 h-3 text-cream/30" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{e.subject}</p>
                      <p className="text-xs text-cream/40">{formatDateShort(e.scheduledAt)} · {e.roomName ?? 'Salle TBD'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
