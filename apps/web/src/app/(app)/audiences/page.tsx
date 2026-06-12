'use client';



import { useState, useEffect } from 'react';

import Link from 'next/link';

import { useSearchParams } from 'next/navigation';

import { motion } from 'framer-motion';

import { Search, Plus, Filter, Clock } from 'lucide-react';

import { AuthGuard } from '@/components/auth/auth-guard';

import { Card } from '@/components/ui/card';

import { StatusBadge, PriorityBadge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { NewAudienceModal } from '@/components/audiences/new-audience-modal';

import { useAudiencesStore } from '@/stores/audiences-store';

import { useAuthStore, canCreateAudience, canFilterAudiencesByPriority, isWaitingRoomRole } from '@/stores/auth-store';

import { STATUS_LABELS, PRIORITY_LABELS } from '@/types';

import { formatDateShort } from '@/lib/utils';



function formatTime(iso: string) {

  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

}



export default function AudiencesPage() {

  const audiences = useAudiencesStore((s) => s.audiences);

  const waitingRoomToday = useAudiencesStore((s) => s.waitingRoomToday);

  const isSyncing = useAudiencesStore((s) => s.isSyncing);

  const { user, permissions } = useAuthStore();

  const canCreate = canCreateAudience(user?.role, permissions);

  const isWaitingRoom = isWaitingRoomRole(user?.role);

  const canFilterByPriority = canFilterAudiencesByPriority(user?.role);

  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const [modalOpen, setModalOpen] = useState(false);



  useEffect(() => {

    if (searchParams.get('new') === '1' && canCreate) setModalOpen(true);

  }, [searchParams, canCreate]);



  const filtered = audiences.filter((a) => {

    const matchSearch =

      !search ||

      a.reference.toLowerCase().includes(search.toLowerCase()) ||

      a.subject.toLowerCase().includes(search.toLowerCase()) ||

      a.requesterName.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;

    const matchPriority = !canFilterByPriority || priorityFilter === 'ALL' || a.priority === priorityFilter;

    return matchSearch && matchStatus && matchPriority;

  });



  return (

    <AuthGuard>

      <NewAudienceModal open={modalOpen} onOpenChange={setModalOpen} />



      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>

            <h1 className="text-2xl font-bold">

              {isWaitingRoom ? 'Enregistrement des audiences' : 'Gestion des audiences'}

            </h1>

            <p className="text-cream/50 text-sm mt-1">

              {isWaitingRoom

                ? `${waitingRoomToday.length} enregistrement(s) aujourd'hui`

                : `${filtered.length} demande(s)`}

            </p>

          </div>

          {canCreate ? (

            <Button onClick={() => setModalOpen(true)}>

              <Plus className="w-4 h-4" /> Nouvelle audience

            </Button>

          ) : null}

        </div>



        {isWaitingRoom ? (

          <>

            <Card className="!p-4 border-military-800/40 bg-military-950/20">

              <p className="text-sm text-cream/60">

                Vous voyez uniquement les demandes que vous avez enregistrées aujourd&apos;hui.

                Le suivi (validation, report ou refus) est géré par les autres services et n&apos;est pas visible ici, y compris pour les Priorité 0.

              </p>

            </Card>



            <div className="space-y-3">

              {isSyncing && waitingRoomToday.length === 0 ? (

                <Card className="text-center py-12 text-cream/40">Chargement…</Card>

              ) : waitingRoomToday.length === 0 ? (

                <Card className="text-center py-12 text-cream/40">

                  Aucun enregistrement aujourd&apos;hui.{' '}

                  <button type="button" onClick={() => setModalOpen(true)} className="text-military-400 hover:underline cursor-pointer">

                    Enregistrer une demande

                  </button>

                </Card>

              ) : (

                waitingRoomToday.map((aud, i) => (

                  <motion.div

                    key={aud.id}

                    initial={{ opacity: 0, x: -10 }}

                    animate={{ opacity: 1, x: 0 }}

                    transition={{ delay: i * 0.05 }}

                  >

                    <Card className="!p-4 border-carbon-700/50">

                      <div className="flex flex-wrap items-center gap-4">

                        <div className="font-mono text-sm text-military-400 w-36 shrink-0">{aud.reference}</div>

                        <div className="flex-1 min-w-[200px]">

                          <p className="font-medium">{aud.subject}</p>

                          <p className="text-xs text-cream/40">{aud.requesterName}</p>

                        </div>

                        {aud.priority === 'PRIORITE_0' ? (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-carbon-600/50 text-cream/50 shrink-0">
                            {PRIORITY_LABELS.PRIORITE_0}
                          </span>
                        ) : null}

                        <div className="flex items-center gap-1.5 text-xs text-cream/40 shrink-0">

                          <Clock className="w-3.5 h-3.5" />

                          {formatTime(aud.createdAt)}

                        </div>

                      </div>

                    </Card>

                  </motion.div>

                ))

              )}

            </div>

          </>

        ) : (

          <>

            <Card className="!p-4">

              <div className="flex flex-wrap gap-3">

                <div className="relative flex-1 min-w-[200px]">

                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30" />

                  <input

                    value={search}

                    onChange={(e) => setSearch(e.target.value)}

                    placeholder="Rechercher par référence, objet..."

                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"

                  />

                </div>

                <div className="flex items-center gap-2">

                  <Filter className="w-4 h-4 text-cream/40" />

                  <select

                    value={statusFilter}

                    onChange={(e) => setStatusFilter(e.target.value)}

                    aria-label="Filtrer par statut"

                    className="h-10 px-3 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"

                  >

                    <option value="ALL">Tous les statuts</option>

                    {Object.entries(STATUS_LABELS).map(([k, v]) => (

                      <option key={k} value={k}>{v}</option>

                    ))}

                  </select>

                  {canFilterByPriority ? (
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      aria-label="Filtrer par priorité"
                      className="h-10 px-3 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"
                    >
                      <option value="ALL">Toutes les priorités</option>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  ) : null}

                </div>

              </div>

            </Card>



            <div className="space-y-3">

              {filtered.length === 0 ? (

                <Card className="text-center py-12 text-cream/40">

                  Aucune audience trouvée.{' '}

                  <button type="button" onClick={() => setModalOpen(true)} className="text-military-400 hover:underline cursor-pointer">

                    Créer une demande

                  </button>

                </Card>

              ) : (

                filtered.map((aud, i) => (

                  <motion.div

                    key={aud.id}

                    initial={{ opacity: 0, x: -10 }}

                    animate={{ opacity: 1, x: 0 }}

                    transition={{ delay: i * 0.05 }}

                  >

                    <Link href={`/audiences/${aud.id}`}>

                      <Card className="!p-4 hover:border-military-600/40 transition-all cursor-pointer group">

                        <div className="flex flex-wrap items-center gap-4">

                          <div className="font-mono text-sm text-military-400 w-36">{aud.reference}</div>

                          <div className="flex-1 min-w-[200px]">

                            <p className="font-medium group-hover:text-gold-400 transition-colors">{aud.subject}</p>

                            <p className="text-xs text-cream/40">

                              {aud.requesterName}

                              {aud.grade ? ` · ${aud.grade}` : ''}

                            </p>

                          </div>

                          <div className="flex items-center gap-2">

                            <PriorityBadge priority={aud.priority} />

                            <StatusBadge status={aud.status} />

                          </div>

                          <div className="text-xs text-cream/40 w-24 text-right">

                            {aud.scheduledAt ? formatDateShort(aud.scheduledAt) : '—'}

                          </div>

                        </div>

                      </Card>

                    </Link>

                  </motion.div>

                ))

              )}

            </div>

          </>

        )}

      </div>

    </AuthGuard>

  );

}


