'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import {
  createMilitaryGradeApi,
  deleteMilitaryGradeApi,
  listMilitaryGradesApi,
  type MilitaryGradeItem,
} from '@/lib/api-client';
import { API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import { Plus, Medal, RefreshCw, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';

const inputClass =
  'flex-1 h-9 px-3 rounded-lg bg-carbon-800 border border-carbon-600 text-sm text-cream focus:outline-none focus:border-military-500 focus:ring-1 focus:ring-military-500/30 transition-all';

export function MilitaryGradesTab() {
  const { accessToken } = useAuthStore();
  const [grades, setGrades] = useState<MilitaryGradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MilitaryGradeItem | null>(null);

  const loadGrades = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError('');

    try {
      const data = await listMilitaryGradesApi(accessToken);
      setGrades(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : API_UNAVAILABLE_MESSAGE);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newLabel.trim()) return;

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      const created = await createMilitaryGradeApi(accessToken, newLabel.trim());
      setGrades((prev) =>
        [...prev, created].sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'accent' })),
      );
      setNewLabel('');
      setSuccess(`Grade « ${created.label} » ajouté`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !deleteTarget) return;

    setError('');
    setSuccess('');

    try {
      await deleteMilitaryGradeApi(accessToken, deleteTarget.id);
      setGrades((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setSuccess(`Grade « ${deleteTarget.label} » supprimé`);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Medal className="w-5 h-5 text-gold-400" />
            Grades militaires
          </h2>
          <p className="text-sm text-cream/40 mt-1">
            Liste utilisée lors de l&apos;enregistrement des demandes d&apos;audience (catégorie Militaire).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadGrades()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      <Card className="!p-4">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nouveau grade (ex. Major)"
            className={inputClass}
            minLength={2}
            required
          />
          <Button type="submit" disabled={adding || !newLabel.trim()} className="shrink-0">
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </form>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-cream/40">Chargement…</div>
      ) : grades.length === 0 ? (
        <div className="text-center py-12 text-cream/40">Aucun grade configuré</div>
      ) : (
        <div className="space-y-2">
          {grades.map((grade) => (
            <Card key={grade.id} className="!p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-military-900/50 flex items-center justify-center shrink-0">
                    <Medal className="w-4 h-4 text-gold-400" />
                  </div>
                  <p className="font-medium truncate">{grade.label}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Supprimer"
                  onClick={() => setDeleteTarget(grade)}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer ce grade ?"
        description={
          deleteTarget
            ? `Le grade « ${deleteTarget.label} » sera retiré de la liste. Les audiences déjà enregistrées conservent leur grade actuel.`
            : ''
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
