'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Audience, Priority, Confidentiality, VisitMode, AccompaniedPerson, WaitingRoomAudienceEntry } from '@/types';
import { nextAudienceReference, mapApiAudience } from '@/lib/audience-utils';
import { getAudienceApi, listAudiencesApi, listMyTodayAudiencesApi } from '@/lib/api-client';
import { API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';

export interface CreateAudienceInput {
  subject: string;
  motive: string;
  requesterName: string;
  requesterOrg?: string;
  priority: Priority;
  confidentiality: Confidentiality;
  category?: string;
  grade?: string;
  visitMode?: VisitMode;
  visitorFunction?: string;
  accompaniedPersons?: AccompaniedPerson[];
}

function nextReference(audiences: Audience[]): string {
  return nextAudienceReference(audiences.map((a) => a.reference));
}

interface AudiencesState {
  audiences: Audience[];
  waitingRoomToday: WaitingRoomAudienceEntry[];
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: string | null;
  addAudience: (input: CreateAudienceInput) => Audience;
  insertAudience: (audience: Audience) => void;
  insertWaitingRoomEntry: (entry: WaitingRoomAudienceEntry) => void;
  getById: (id: string) => Audience | undefined;
  setAudiences: (audiences: Audience[]) => void;
  clearAllAudiences: () => void;
  syncFromApi: (token: string) => Promise<boolean>;
  syncWaitingRoomToday: (token: string) => Promise<boolean>;
  fetchAudienceById: (token: string, id: string) => Promise<Audience | undefined>;
  removeAudience: (id: string) => void;
  upsertAudience: (audience: Audience) => void;
}

export const useAudiencesStore = create<AudiencesState>()(
  persist(
    (set, get) => ({
      audiences: [],
      waitingRoomToday: [],
      isSyncing: false,
      syncError: null,
      lastSyncedAt: null,

      addAudience: (input) => {
        const audiences = get().audiences;
        const audience: Audience = {
          id: `aud-${Date.now()}`,
          reference: nextReference(audiences),
          subject: input.subject,
          motive: input.motive,
          requesterName: input.requesterName,
          requesterOrg: input.requesterOrg,
          status: 'EN_ATTENTE',
          priority: input.priority,
          confidentiality: input.confidentiality,
          category: input.category ?? 'AUTRE',
          grade: input.grade,
          visitMode: input.visitMode,
          visitorFunction: input.visitorFunction,
          accompaniedPersons: input.accompaniedPersons,
          createdAt: new Date().toISOString(),
        };

        set({ audiences: [audience, ...audiences] });
        return audience;
      },

      insertAudience: (audience) => {
        const audiences = get().audiences;
        if (audiences.some((a) => a.id === audience.id)) return;
        set({ audiences: [audience, ...audiences] });
      },

      insertWaitingRoomEntry: (entry) => {
        const list = get().waitingRoomToday;
        if (list.some((a) => a.id === entry.id)) return;
        set({ waitingRoomToday: [entry, ...list] });
      },

      getById: (id) => get().audiences.find((a) => a.id === id),

      setAudiences: (audiences) => set({ audiences }),

      clearAllAudiences: () => set({ audiences: [], waitingRoomToday: [], lastSyncedAt: null, syncError: null }),

      syncFromApi: async (token) => {
        set({ isSyncing: true, syncError: null });
        try {
          const records = await listAudiencesApi(token);
          set({
            audiences: records.map(mapApiAudience),
            lastSyncedAt: new Date().toISOString(),
            syncError: null,
          });
          return true;
        } catch (error) {
          set({
            syncError: error instanceof Error ? error.message : API_UNAVAILABLE_MESSAGE,
          });
          return false;
        } finally {
          set({ isSyncing: false });
        }
      },

      syncWaitingRoomToday: async (token) => {
        set({ isSyncing: true, syncError: null });
        try {
          const records = await listMyTodayAudiencesApi(token);
          set({
            waitingRoomToday: records.map((r) => ({
              id: r.id,
              reference: r.reference,
              subject: r.subject,
              requesterName: r.requesterName,
              category: r.category,
              priority: r.priority as WaitingRoomAudienceEntry['priority'],
              createdAt: r.createdAt,
            })),
            lastSyncedAt: new Date().toISOString(),
            syncError: null,
          });
          return true;
        } catch (error) {
          set({
            syncError: error instanceof Error ? error.message : API_UNAVAILABLE_MESSAGE,
          });
          return false;
        } finally {
          set({ isSyncing: false });
        }
      },

      fetchAudienceById: async (token, id) => {
        const existing = get().getById(id);
        if (existing) return existing;

        try {
          const record = await getAudienceApi(token, id);
          const audience = mapApiAudience(record);
          get().insertAudience(audience);
          return audience;
        } catch {
          return undefined;
        }
      },

      removeAudience: (id) => {
        set({ audiences: get().audiences.filter((a) => a.id !== id) });
      },

      upsertAudience: (audience) => {
        const list = get().audiences;
        const idx = list.findIndex((a) => a.id === audience.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = { ...next[idx], ...audience };
          set({ audiences: next });
        } else {
          set({ audiences: [audience, ...list] });
        }
      },
    }),
    {
      name: 'audax-audiences-v2',
      partialize: (state) => ({
        audiences: state.audiences,
        waitingRoomToday: state.waitingRoomToday,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);
