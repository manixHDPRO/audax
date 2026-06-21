'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Audience, Priority, Confidentiality, VisitMode, AccompaniedPerson, WaitingRoomAudienceEntry, AudienceStatus } from '@/types';
import { nextAudienceReference, mapApiAudience } from '@/lib/audience-utils';
import { getAudienceApi, listAudiencesApi, listMyTodayAudiencesApi } from '@/lib/api-client';
import { API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import { MOCK_AUDIENCES } from '@/lib/mock-data';

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

/** Conserve l'historique détaillé quand la liste API ne le renvoie pas. */
function mergeAudienceDetail(previous: Audience | undefined, incoming: Audience): Audience {
  if (!previous) return incoming;
  return {
    ...incoming,
    statusHistory: incoming.statusHistory?.length ? incoming.statusHistory : previous.statusHistory,
    validations: incoming.validations?.length ? incoming.validations : previous.validations,
    visitTarget: incoming.visitTarget ?? previous.visitTarget,
    createdBy: incoming.createdBy ?? previous.createdBy,
  };
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
  syncFromApi: (token: string, options?: { silent?: boolean }) => Promise<boolean>;
  syncWaitingRoomToday: (token: string) => Promise<boolean>;
  fetchAudienceById: (token: string, id: string, options?: { force?: boolean }) => Promise<Audience | undefined>;
  removeAudience: (id: string) => void;
  upsertAudience: (audience: Audience) => void;
  patchAudienceStatus: (id: string, status: AudienceStatus) => void;
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

      syncFromApi: async (token, options) => {
        const silent = options?.silent ?? false;
        if (!silent) set({ isSyncing: true, syncError: null });
        try {
          const records = await listAudiencesApi(token);
          const previousById = new Map(get().audiences.map((a) => [a.id, a]));
          set({
            audiences: records.map((record) =>
              mergeAudienceDetail(previousById.get(record.id), mapApiAudience(record)),
            ),
            lastSyncedAt: new Date().toISOString(),
            syncError: null,
          });
          return true;
        } catch (error) {
          if (!silent) {
            set({
              syncError: error instanceof Error ? error.message : API_UNAVAILABLE_MESSAGE,
            });
          }
          return false;
        } finally {
          if (!silent) set({ isSyncing: false });
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
              visitor: r.visitor ?? null,
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

      fetchAudienceById: async (token, id, options) => {
        const cached = get().getById(id);
        if (!options?.force && cached?.statusHistory?.length) {
          return cached;
        }

        try {
          const record = await getAudienceApi(token, id);
          const audience = mapApiAudience(record);
          const previous = get().getById(id);
          get().upsertAudience(mergeAudienceDetail(previous, audience));
          return mergeAudienceDetail(previous, audience);
        } catch {
          return cached;
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
          next[idx] = mergeAudienceDetail(list[idx], audience);
          set({ audiences: next });
        } else {
          set({ audiences: [audience, ...list] });
        }
      },

      patchAudienceStatus: (id, status) => {
        const list = get().audiences;
        const idx = list.findIndex((a) => a.id === id);
        if (idx < 0) return;
        const next = [...list];
        next[idx] = { ...next[idx], status };
        set({ audiences: next });
      },
    }),
    {
      name: 'audax-audiences-v3',
      partialize: (state) => ({
        audiences: state.audiences,
        waitingRoomToday: state.waitingRoomToday,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);
