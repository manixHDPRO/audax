'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PRIORITY_LABELS, STATUS_LABELS, type Audience, type AudienceStatus } from '@/types';
import { formatDateShort } from '@/lib/utils';

const KANBAN_COLUMNS: AudienceStatus[] = [
  'EN_ATTENTE',
  'EN_ANALYSE',
  'VALIDEE',
  'PLANIFIEE',
  'CONFIRMEE',
  'DEJA_ENVOYE',
  'REJETEE',
  'TERMINEE',
  'ARCHIVEE',
];

const TABLE_PAGE_SIZES = [10, 20, 50] as const;

function visitTargetLabel(audience: Audience) {
  if (!audience.visitTarget) return '—';
  return `${audience.visitTarget.firstName} ${audience.visitTarget.lastName}`;
}

interface AudienceKanbanViewProps {
  audiences: Audience[];
}

export function AudienceKanbanView({ audiences }: AudienceKanbanViewProps) {
  const byStatus = KANBAN_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = audiences.filter((a) => a.status === status);
      return acc;
    },
    {} as Record<AudienceStatus, Audience[]>,
  );

  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex gap-3 min-w-max">
        {KANBAN_COLUMNS.map((status) => {
          const items = byStatus[status];
          return (
            <div
              key={status}
              className="w-72 shrink-0 flex flex-col rounded-xl border border-carbon-700/50 bg-carbon-900/40"
            >
              <div className="px-3 py-2.5 border-b border-carbon-700/50 flex items-center justify-between gap-2">
                <StatusBadge status={status} />
                <span className="text-xs text-cream/40 tabular-nums">{items.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-cream/30 text-center py-6 px-2">Aucune demande</p>
                ) : (
                  items.map((aud) => (
                    <Link key={aud.id} href={`/audiences/${aud.id}`}>
                      <Card className="!p-3 hover:border-military-600/40 transition-all cursor-pointer group">
                        <p className="font-mono text-[11px] text-military-400">{aud.reference}</p>
                        <p className="font-medium text-sm mt-1 group-hover:text-gold-400 transition-colors line-clamp-2">
                          {aud.subject}
                        </p>
                        <p className="text-xs text-cream/40 mt-1 truncate">{aud.requesterName}</p>
                        {aud.visitTarget ? (
                          <p className="text-[11px] text-cream/35 mt-1 truncate">
                            → {visitTargetLabel(aud)}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <PriorityBadge priority={aud.priority} />
                          {aud.scheduledAt ? (
                            <span className="text-[10px] text-cream/40">{formatDateShort(aud.scheduledAt)}</span>
                          ) : null}
                        </div>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AudienceTableViewProps {
  audiences: Audience[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function AudienceTableView({
  audiences,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: AudienceTableViewProps) {
  const total = audiences.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = audiences.slice(start, start + pageSize);

  const pageNumbers = (() => {
    const maxVisible = 5;
    let startPage = Math.max(1, safePage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    startPage = Math.max(1, endPage - maxVisible + 1);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  })();

  return (
    <div className="space-y-3">
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-carbon-700/60 bg-carbon-900/50 text-left">
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-cream/40 font-medium">Référence</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-cream/40 font-medium">Demandeur</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-cream/40 font-medium">Personne à voir</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-cream/40 font-medium">Objet</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-cream/40 font-medium">Priorité</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-cream/40 font-medium">Statut</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-cream/40 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((aud) => (
                <tr
                  key={aud.id}
                  className="border-b border-carbon-800/60 hover:bg-carbon-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/audiences/${aud.id}`}
                      className="font-mono text-military-400 hover:text-gold-400 transition-colors"
                    >
                      {aud.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{aud.requesterName}</p>
                    {aud.grade ? <p className="text-xs text-cream/40">{aud.grade}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-cream/70">{visitTargetLabel(aud)}</td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <Link
                      href={`/audiences/${aud.id}`}
                      className="line-clamp-2 hover:text-gold-400 transition-colors"
                    >
                      {aud.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={aud.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={aud.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-cream/50 text-xs whitespace-nowrap">
                    {aud.scheduledAt ? formatDateShort(aud.scheduledAt) : formatDateShort(aud.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-cream/40">
          {total === 0
            ? 'Aucun résultat'
            : `${start + 1}–${Math.min(start + pageSize, total)} sur ${total}`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-cream/40">
            Par page
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Nombre de lignes par page"
              className="h-8 px-2 rounded-lg bg-carbon-800 border border-carbon-600 text-cream text-xs focus:outline-none focus:border-military-500"
            >
              {TABLE_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {pageNumbers.map((n) => (
            <Button
              key={n}
              type="button"
              variant={n === safePage ? 'default' : 'outline'}
              size="sm"
              className="min-w-9"
              onClick={() => onPageChange(n)}
            >
              {n}
            </Button>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export type AudienceListViewMode = 'kanban' | 'table';

export const AUDIENCE_LIST_VIEW_STORAGE_KEY = 'audax-audiences-list-view';
