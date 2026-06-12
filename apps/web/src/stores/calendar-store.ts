'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CalendarEvent {
  id: string;
  reference: string;
  subject: string;
  scheduledAt: string;
  durationMinutes: number;
  roomName?: string;
}

export interface CalendarConflict {
  eventA: CalendarEvent;
  eventB: CalendarEvent;
}

const SLOT_MS = 60 * 60 * 1000;

function detectConflicts(events: CalendarEvent[]): CalendarConflict[] {
  const conflicts: CalendarConflict[] = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      const aStart = new Date(a.scheduledAt).getTime();
      const aEnd = aStart + a.durationMinutes * 60 * 1000;
      const bStart = new Date(b.scheduledAt).getTime();
      const bEnd = bStart + b.durationMinutes * 60 * 1000;
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.push({ eventA: a, eventB: b });
      }
    }
  }
  return conflicts;
}

interface CalendarState {
  events: CalendarEvent[];
  draggingId: string | null;
  conflicts: CalendarConflict[];
  setDragging: (id: string | null) => void;
  reschedule: (eventId: string, newDate: Date) => boolean;
  getEventsForDay: (year: number, month: number, day: number) => CalendarEvent[];
  clearEvents: () => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      draggingId: null,
      conflicts: [],

      setDragging: (id) => set({ draggingId: id }),

      reschedule: (eventId, newDate) => {
        const events = get().events.map((e) => {
          if (e.id !== eventId) return e;
          const old = new Date(e.scheduledAt);
          const updated = new Date(newDate);
          updated.setHours(old.getHours(), old.getMinutes(), 0, 0);
          return { ...e, scheduledAt: updated.toISOString() };
        });
        const conflicts = detectConflicts(events);
        set({ events, conflicts });
        return conflicts.some(
          (c) => c.eventA.id === eventId || c.eventB.id === eventId,
        );
      },

      getEventsForDay: (year, month, day) =>
        get().events.filter((e) => {
          const d = new Date(e.scheduledAt);
          return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        }),

      clearEvents: () => set({ events: [], conflicts: [] }),
    }),
    { name: 'audax-calendar-v2' },
  ),
);

export { detectConflicts, SLOT_MS };
