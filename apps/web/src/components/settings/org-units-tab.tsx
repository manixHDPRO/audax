'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import {
  listCabinetsApi,
  listBureausApi,
  createCabinetApi,
  createBureauApi,
  deleteCabinetApi,
  deleteBureauApi,
  type OrgUnit,
} from '@/lib/api-client';
import { Plus, Building2, Briefcase, RefreshCw, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';

export function OrgUnitsTab() {
  const { accessToken } = useAuthStore();
  const [cabinets, setCabinets] = useState<OrgUnit[]>([]);
  const [bureaus, setBureaus] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [addingTo, setAddingTo] = useState<'cabinet' | 'bureau' | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<{ type: 'cabinet' | 'bureau'; id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [c, b] = await Promise.all([
        listCabinetsApi(accessToken),
        listBureausApi(accessToken),
      ]);
      setCabinets(c);
      setBureaus(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAdd() {
    if (!accessToken || !newName.trim() || !addingTo) return;
    try {
      if (addingTo === 'cabinet') {
        const created = await createCabinetApi(accessToken, newName.trim());
        setCabinets((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const created = await createBureauApi(accessToken, newName.trim());
        setBureaus((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setNewName('');
      setAddingTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
    }
  }

  async function confirmDelete() {
    if (!accessToken || !unitToDelete) return;
    const { type, id } = unitToDelete;
    try {
      if (type === 'cabinet') {
        await deleteCabinetApi(accessToken, id);
        setCabinets((prev) => prev.filter((c) => c.id !== id));
      } else {
        await deleteBureauApi(accessToken, id);
        setBureaus((prev) => prev.filter((b) => b.id !== id));
      }
      setUnitToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-cream">Structure Organisationnelle</h2>
          <p className="text-sm text-cream/40">Gérez les cabinets et les bureaux de l'institution</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/50 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cabinets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gold-500">
              <Building2 className="w-5 h-5" />
              <h3 className="font-medium uppercase tracking-wider text-sm">Cabinets</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAddingTo('cabinet');
                setNewName('');
              }}
              className="h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {addingTo === 'cabinet' && (
              <Card className="!p-3 border-military-500/50 bg-military-900/20">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom du cabinet..."
                    className="flex-1 bg-carbon-900 border border-carbon-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-military-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                  <Button size="sm" onClick={handleAdd}>Ajouter</Button>
                  <Button variant="ghost" size="sm" onClick={() => setAddingTo(null)}>Annuler</Button>
                </div>
              </Card>
            )}

            {cabinets.map((c) => (
              <Card key={c.id} className="!p-3 flex items-center justify-between group hover:border-military-500/30 transition-colors">
                <span className="text-sm text-cream/80">{c.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUnitToDelete({ type: 'cabinet', id: c.id, name: c.name });
                    setDeleteModalOpen(true);
                  }}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </Card>
            ))}
            {!loading && cabinets.length === 0 && !addingTo && (
              <p className="text-center py-4 text-xs text-cream/20 italic">Aucun cabinet défini</p>
            )}
          </div>
        </div>

        {/* Bureaus Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-military-400">
              <Briefcase className="w-5 h-5" />
              <h3 className="font-medium uppercase tracking-wider text-sm">Bureaux</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAddingTo('bureau');
                setNewName('');
              }}
              className="h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {addingTo === 'bureau' && (
              <Card className="!p-3 border-military-500/50 bg-military-900/20">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom du bureau..."
                    className="flex-1 bg-carbon-900 border border-carbon-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-military-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                  <Button size="sm" onClick={handleAdd}>Ajouter</Button>
                  <Button variant="ghost" size="sm" onClick={() => setAddingTo(null)}>Annuler</Button>
                </div>
              </Card>
            )}

            {bureaus.map((b) => (
              <Card key={b.id} className="!p-3 flex items-center justify-between group hover:border-military-500/30 transition-colors">
                <span className="text-sm text-cream/80">{b.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUnitToDelete({ type: 'bureau', id: b.id, name: b.name });
                    setDeleteModalOpen(true);
                  }}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </Card>
            ))}
            {!loading && bureaus.length === 0 && !addingTo && (
              <p className="text-center py-4 text-xs text-cream/20 italic">Aucun bureau défini</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={`Supprimer le ${unitToDelete?.type === 'cabinet' ? 'cabinet' : 'bureau'}`}
        description={`Êtes-vous sûr de vouloir supprimer "${unitToDelete?.name}" ? Cette action est irréversible.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
