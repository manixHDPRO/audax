'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, AlertCircle, CheckCircle2, Plus, Trash2, Users, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAudiencesStore } from '@/stores/audiences-store';
import { useAuthStore, isWaitingRoomRole } from '@/stores/auth-store';
import { createAudienceApi, listVisitTargetsApi, searchRequestersFromAudiencesApi, checkDuplicateTodayApi, type RequesterSearchResult, type DuplicateTodayResult } from '@/lib/api-client';
import { notifyAudienceSync, buildCreateAudienceAlertSync } from '@/lib/audience-sync-bus';
import { formatAccompaniedPerson } from '@/lib/audience-utils';
import type { Audience, Priority, Confidentiality, VisitMode, AccompaniedPerson, UserRole } from '@/types';
import { ROLE_LABELS } from '@/types';

const CATEGORIES = [
  { value: 'MILITAIRE', label: 'Militaire' },
  { value: 'DIPLOMATIQUE', label: 'Diplomatique' },
  { value: 'CIVIL', label: 'Civil' },
  { value: 'INSTITUTIONNEL', label: 'Institutionnel' },
  { value: 'AUTRE', label: 'Autre' },
];

const MILITARY_GRADES = [
  'Général d\'armée',
  'Général de corps d\'armée',
  'Général de division',
  'Général de brigade',
  'Colonel',
  'Lieutenant-colonel',
  'Commandant',
  'Capitaine',
  'Lieutenant',
  'Sous-lieutenant',
  'Adjudant-chef',
  'Adjudant',
  'Sergent-chef',
  'Sergent',
  'Caporal',
  'Soldat de 1ère classe',
];

const emptyAccompanied = (): AccompaniedPerson => ({ name: '', grade: '' });

const inputClass =
  'mt-1 w-full h-9 px-3 rounded-lg bg-carbon-800 border border-carbon-600 text-sm text-cream focus:outline-none focus:border-military-500 focus:ring-1 focus:ring-military-500/30 transition-all';

const labelClass = 'text-[10px] uppercase tracking-wider text-cream/50';

const sectionClass =
  'rounded-xl border border-carbon-700/50 bg-carbon-900/30 p-3 space-y-2.5';

const sectionTitleClass = 'text-[11px] font-semibold uppercase tracking-wider text-military-400/90';

const rowInputClass =
  'h-8 px-2.5 rounded-lg bg-carbon-800 border border-carbon-600 text-xs text-cream focus:outline-none focus:border-military-500';

function extractGradeFromMotive(motive: string): string | undefined {
  for (const grade of MILITARY_GRADES) {
    if (motive.includes(grade)) return grade;
  }
  return undefined;
}

interface NewAudienceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAudienceModal({ open, onOpenChange }: NewAudienceModalProps) {
  const router = useRouter();
  const insertAudience = useAudiencesStore((s) => s.insertAudience);
  const { accessToken, user } = useAuthStore();
  const isWaitingRoom = isWaitingRoomRole(user?.role);

  const [category, setCategory] = useState('MILITAIRE');
  const [visitMode, setVisitMode] = useState<VisitMode>('INDIVIDUEL');
  const [accompaniedPersons, setAccompaniedPersons] = useState<AccompaniedPerson[]>([emptyAccompanied()]);
  const [visitTargetUserId, setVisitTargetUserId] = useState('');
  const [visitTargets, setVisitTargets] = useState<
    { id: string; firstName: string; lastName: string; role: string }[]
  >([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ reference: string; id: string; priorite0?: boolean } | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [requesterFunction, setRequesterFunction] = useState('');
  const [gradeValue, setGradeValue] = useState('');
  const [searchResults, setSearchResults] = useState<RequesterSearchResult | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [duplicateToday, setDuplicateToday] = useState<DuplicateTodayResult | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMilitary = category === 'MILITAIRE';
  const isAccompanied = visitMode === 'ACCOMPAGNE';

  const resetForm = () => {
    setCategory('MILITAIRE');
    setVisitMode('INDIVIDUEL');
    setAccompaniedPersons([emptyAccompanied()]);
    setVisitTargetUserId('');
    setRequesterName('');
    setRequesterFunction('');
    setGradeValue('');
    setSearchResults(null);
    setShowSearchResults(false);
    setDuplicateToday(null);
    setConfirmDuplicate(false);
    setError('');
    setSuccess(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!open || !accessToken) return;

    let cancelled = false;
    setLoadingTargets(true);
    void listVisitTargetsApi(accessToken)
      .then((users) => {
        if (!cancelled) setVisitTargets(users);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger la liste des personnes à voir');
      })
      .finally(() => {
        if (!cancelled) setLoadingTargets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, accessToken]);

  useEffect(() => {
    if (!open || !accessToken || requesterName.trim().length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      void searchRequestersFromAudiencesApi(accessToken, requesterName.trim())
        .then((results) => {
          setSearchResults(results);
          setShowSearchResults(results.requesters.length > 0);
        })
        .catch(() => setSearchResults(null));
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [open, accessToken, requesterName]);

  useEffect(() => {
    if (!open || !accessToken || requesterName.trim().length < 2) {
      setDuplicateToday(null);
      setConfirmDuplicate(false);
      return;
    }

    const timer = setTimeout(() => {
      void checkDuplicateTodayApi(accessToken, requesterName.trim())
        .then((result) => {
          setDuplicateToday(result);
          if (!result.hasDuplicate) setConfirmDuplicate(false);
        })
        .catch(() => setDuplicateToday(null));
    }, 400);

    return () => clearTimeout(timer);
  }, [open, accessToken, requesterName]);

  const applyRequesterSelection = (
    name: string,
    fonction: string,
    cat?: string,
    motive?: string,
  ) => {
    setRequesterName(name);
    setRequesterFunction(fonction);
    if (cat) setCategory(cat);
    if (cat === 'MILITAIRE' && motive) {
      const grade = extractGradeFromMotive(motive);
      if (grade) setGradeValue(grade);
    }
    setShowSearchResults(false);
    setConfirmDuplicate(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const updateAccompanied = (index: number, field: keyof AccompaniedPerson, value: string) => {
    setAccompaniedPersons((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const addAccompaniedPerson = () => {
    setAccompaniedPersons((prev) => [...prev, emptyAccompanied()]);
  };

  const removeAccompaniedPerson = (index: number) => {
    setAccompaniedPersons((prev) =>
      prev.length <= 1 ? [emptyAccompanied()] : prev.filter((_, i) => i !== index),
    );
  };

  const handleVisitModeChange = (mode: VisitMode) => {
    setVisitMode(mode);
    if (mode === 'INDIVIDUEL') setAccompaniedPersons([emptyAccompanied()]);
    else if (accompaniedPersons.length === 0) setAccompaniedPersons([emptyAccompanied()]);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    if (value !== 'MILITAIRE') {
      setAccompaniedPersons((prev) => prev.map((p) => ({ ...p, grade: '' })));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const nom = requesterName.trim();
    const fonction = requesterFunction.trim();
    const objet = String(form.get('objet') ?? '').trim();
    const grade = isMilitary ? gradeValue.trim() : undefined;
    const cat = String(form.get('category') ?? category);
    const priority = String(form.get('priority') ?? 'NORMALE') as Priority;
    const confidentiality = String(form.get('confidentiality') ?? 'STANDARD') as Confidentiality;
    const personToVisit = visitTargetUserId.trim();

    const persons = accompaniedPersons
      .map((p) => ({ name: p.name.trim(), grade: p.grade?.trim() || undefined }))
      .filter((p) => p.name);

    if (!nom || !fonction || !objet) {
      setError('Veuillez remplir tous les champs obligatoires.');
      setLoading(false);
      return;
    }

    if (!personToVisit) {
      setError('Veuillez sélectionner la personne à voir.');
      setLoading(false);
      return;
    }

    if (isMilitary && !grade) {
      setError('Veuillez sélectionner le grade du demandeur.');
      setLoading(false);
      return;
    }

    if (isAccompanied && persons.length === 0) {
      setError('Veuillez ajouter au moins une personne accompagnante.');
      setLoading(false);
      return;
    }

    if (isAccompanied && isMilitary && persons.some((p) => !p.grade)) {
      setError('Veuillez sélectionner le grade de chaque personne accompagnante.');
      setLoading(false);
      return;
    }

    if (duplicateToday?.hasDuplicate && !confirmDuplicate) {
      setError(
        `Une demande active existe déjà aujourd'hui (${duplicateToday.audiences.map((a) => a.reference).join(', ')}). Cochez la confirmation pour créer une nouvelle demande.`,
      );
      setLoading(false);
      return;
    }

    const visitLabel = isAccompanied ? 'Accompagné' : 'Individuel';
    const accompLabel = persons.length
      ? `Personnes accompagnantes : ${persons.map(formatAccompaniedPerson).join(', ')}`
      : undefined;
    const motive = [visitLabel, grade, fonction, accompLabel].filter(Boolean).join(' · ');

    const payload = {
      subject: objet,
      motive,
      requesterName: nom,
      requesterOrg: fonction,
      priority,
      confidentiality,
      category: cat,
      grade,
      visitMode,
      visitorFunction: fonction,
      accompaniedPersons: isAccompanied ? persons : undefined,
    };

    if (!accessToken) {
      setError('Session expirée — reconnectez-vous');
      setLoading(false);
      return;
    }

    try {
      const createdApi = await createAudienceApi(accessToken, {
        subject: payload.subject,
        motive: payload.motive,
        requesterName: payload.requesterName,
        requesterOrg: payload.requesterOrg,
        category: payload.category,
        priority: payload.priority,
        confidentiality: payload.confidentiality,
        visitTargetUserId: personToVisit,
        allowDuplicateToday: confirmDuplicate || undefined,
      });
      const isPriorite0 = payload.priority === 'PRIORITE_0';
      const selectedTarget = visitTargets.find((u) => u.id === personToVisit);

      if (isWaitingRoom) {
        useAudiencesStore.getState().insertWaitingRoomEntry({
          id: createdApi.id,
          reference: createdApi.reference,
          subject: createdApi.subject,
          requesterName: createdApi.requesterName,
          category: createdApi.category,
          priority: createdApi.priority as Priority,
          createdAt: createdApi.createdAt,
        });
        await useAudiencesStore.getState().syncWaitingRoomToday(accessToken);
      } else {
        insertAudience({
          id: createdApi.id,
          reference: createdApi.reference,
          subject: createdApi.subject,
          motive: payload.motive,
          requesterName: createdApi.requesterName,
          requesterOrg: payload.requesterOrg,
          status: createdApi.status as Audience['status'],
          priority: createdApi.priority as Priority,
          confidentiality: createdApi.confidentiality as Confidentiality,
          category: createdApi.category,
          grade: payload.grade,
          visitMode: payload.visitMode,
          visitorFunction: payload.visitorFunction,
          accompaniedPersons: payload.accompaniedPersons,
          visitTarget: selectedTarget
            ? {
                id: selectedTarget.id,
                firstName: selectedTarget.firstName,
                lastName: selectedTarget.lastName,
                role: selectedTarget.role as UserRole,
              }
            : undefined,
          createdAt: createdApi.createdAt,
        });
        await useAudiencesStore.getState().syncFromApi(accessToken);
      }
      notifyAudienceSync({
        type: 'created',
        audienceId: createdApi.id,
        ...buildCreateAudienceAlertSync(selectedTarget?.role as UserRole | undefined, payload.priority),
      });
      setSuccess({ reference: createdApi.reference, id: createdApi.id, priorite0: isPriorite0 });
      setLoading(false);
      setTimeout(() => {
        handleOpenChange(false);
        if (!isWaitingRoom) {
          router.push(`/audiences/${createdApi.id}`);
        }
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl p-5">
        <DialogHeader className="mb-3">
          <DialogTitle>Nouvelle demande d&apos;audience</DialogTitle>
          <DialogDescription>Classification, demandeur et détails de la visite</DialogDescription>
        </DialogHeader>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10"
          >
            <CheckCircle2 className="w-12 h-12 text-military-400 mx-auto mb-3" />
            <p className="text-military-400 font-semibold">Demande créée</p>
            <p className="text-sm font-mono text-cream/50 mt-2">{success.reference}</p>
            {success.priorite0 ? (
              <p className="text-sm text-cream/60 mt-4 max-w-sm mx-auto">
                Priorité 0 : visible dans votre liste du jour. Le suivi est assuré par le Protocol et l&apos;Administrateur.
              </p>
            ) : null}
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <section className={sectionClass}>
                <h3 className={sectionTitleClass}>Classification</h3>

                <div>
                  <label className={labelClass} htmlFor="category">Catégorie *</label>
                  <select
                    id="category"
                    name="category"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className={inputClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <AnimatePresence initial={false}>
                  {isMilitary && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <label className={labelClass} htmlFor="grade">Grade du demandeur *</label>
                      <select
                        id="grade"
                        name="grade"
                        required={isMilitary}
                        value={gradeValue}
                        onChange={(e) => setGradeValue(e.target.value)}
                        className={inputClass}
                      >
                        <option value="" disabled>Sélectionner un grade</option>
                        {MILITARY_GRADES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass} htmlFor="priority">Priorité</label>
                    <select id="priority" name="priority" defaultValue="NORMALE" className={inputClass}>
                      <option value="PRIORITE_0">Priorité 0</option>
                      <option value="NORMALE">Normale</option>
                      <option value="URGENTE">Urgente</option>
                      <option value="CRITIQUE">Critique</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="confidentiality">Confidentialité</label>
                    <select id="confidentiality" name="confidentiality" defaultValue="STANDARD" className={inputClass}>
                      <option value="STANDARD">Standard</option>
                      <option value="RESTREINT">Restreint</option>
                      <option value="SECRET">Secret</option>
                    </select>
                  </div>
                </div>

                <div>
                  <span className={labelClass}>Type de visite *</span>
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    {[
                      { value: 'INDIVIDUEL' as const, label: 'Individuel' },
                      { value: 'ACCOMPAGNE' as const, label: 'Accompagné' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleVisitModeChange(opt.value)}
                        className={`h-9 rounded-lg border text-xs transition-all cursor-pointer ${
                          visitMode === opt.value
                            ? 'border-military-500 bg-military-900/40 text-gold-400'
                            : 'border-carbon-600 bg-carbon-800 text-cream/70 hover:border-carbon-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className={sectionClass}>
                <h3 className={sectionTitleClass}>Demandeur</h3>

                <div className="relative">
                  <label className={labelClass} htmlFor="nom">Nom *</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream/30" />
                    <input
                      id="nom"
                      name="nom"
                      type="text"
                      required
                      autoComplete="off"
                      placeholder="Rechercher ou saisir le nom complet"
                      value={requesterName}
                      onChange={(e) => {
                        setRequesterName(e.target.value);
                        setConfirmDuplicate(false);
                      }}
                      onFocus={() => {
                        if (searchResults?.requesters.length) {
                          setShowSearchResults(true);
                        }
                      }}
                      className={`${inputClass} mt-0 pl-9`}
                    />
                  </div>
                  {showSearchResults && searchResults?.requesters.length ? (
                    <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-carbon-600 bg-carbon-900 shadow-xl max-h-48 overflow-y-auto">
                      {searchResults.requesters.map((r) => (
                        <button
                          key={`${r.requesterName}-${r.lastReference}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-carbon-800 border-b border-carbon-800/80 last:border-0 cursor-pointer"
                          onClick={() =>
                            applyRequesterSelection(
                              r.requesterName,
                              r.requesterOrg ?? '',
                              r.category,
                              r.motive,
                            )
                          }
                        >
                          <p className="text-sm font-medium">{r.requesterName}</p>
                          <p className="text-[11px] text-cream/40">
                            Audience · {r.lastReference}
                            {r.requesterOrg ? ` · ${r.requesterOrg}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className={labelClass} htmlFor="fonction">Fonction *</label>
                  <input
                    id="fonction"
                    name="fonction"
                    type="text"
                    required
                    placeholder="Fonction ou titre"
                    value={requesterFunction}
                    onChange={(e) => setRequesterFunction(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="visitTargetUserId">Personne à voir *</label>
                  <select
                    id="visitTargetUserId"
                    name="visitTargetUserId"
                    required
                    value={visitTargetUserId}
                    onChange={(e) => setVisitTargetUserId(e.target.value)}
                    disabled={loadingTargets}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {loadingTargets ? 'Chargement…' : 'Sélectionner une personne'}
                    </option>
                    {visitTargets.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                        {user.role in ROLE_LABELS
                          ? ` — ${ROLE_LABELS[user.role as UserRole]}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="objet">Objet *</label>
                  <textarea
                    id="objet"
                    name="objet"
                    rows={2}
                    required
                    placeholder="Objet de la demande d'audience"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-sm text-cream focus:outline-none focus:border-military-500 resize-none min-h-[4.5rem]"
                  />
                </div>
              </section>
            </div>

            <AnimatePresence initial={false}>
              {isAccompanied && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`${sectionClass} overflow-hidden`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`${sectionTitleClass} flex items-center gap-1.5`}>
                      <Users className="w-3.5 h-3.5" />
                      Personnes accompagnantes *
                    </h3>
                    <button
                      type="button"
                      onClick={addAccompaniedPerson}
                      className="text-[11px] text-military-400 hover:text-military-300 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  </div>

                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {accompaniedPersons.map((person, index) => (
                      <div
                        key={index}
                        className={`grid gap-1.5 ${isMilitary ? 'grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]' : 'grid-cols-[1fr_auto]'}`}
                      >
                        {isMilitary && (
                          <select
                            value={person.grade ?? ''}
                            onChange={(e) => updateAccompanied(index, 'grade', e.target.value)}
                            className={rowInputClass}
                            aria-label={`Grade personne ${index + 1}`}
                          >
                            <option value="" disabled>Grade</option>
                            {MILITARY_GRADES.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          value={person.name}
                          onChange={(e) => updateAccompanied(index, 'name', e.target.value)}
                          placeholder="Nom complet"
                          className={rowInputClass}
                          aria-label={`Nom personne ${index + 1}`}
                        />
                        {accompaniedPersons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAccompaniedPerson(index)}
                            className="w-8 h-8 rounded-lg border border-carbon-600 flex items-center justify-center text-cream/40 hover:text-red-400 hover:border-red-800/50 transition-colors cursor-pointer"
                            aria-label="Supprimer cette personne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {duplicateToday?.hasDuplicate ? (
              <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 space-y-2">
                <p className="text-xs text-amber-200/90 font-medium">
                  Demande déjà enregistrée aujourd&apos;hui pour ce visiteur
                </p>
                <ul className="text-[11px] text-cream/50 space-y-1">
                  {duplicateToday.audiences.map((a) => (
                    <li key={a.id}>
                      {a.reference} — {a.subject}
                    </li>
                  ))}
                </ul>
                <label className="flex items-start gap-2 text-xs text-cream/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmDuplicate}
                    onChange={(e) => {
                      setConfirmDuplicate(e.target.checked);
                      if (e.target.checked) setError('');
                    }}
                    className="mt-0.5"
                  />
                  <span>
                    Il s&apos;agit d&apos;une <strong className="text-cream">nouvelle visite</strong> aujourd&apos;hui — créer une nouvelle demande avec une nouvelle référence.
                  </span>
                </label>
              </div>
            ) : null}

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/30 border border-red-800/30 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1 border-t border-carbon-700/40">
              <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" className="flex-1" disabled={loading}>
                <Save className="w-3.5 h-3.5" />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
