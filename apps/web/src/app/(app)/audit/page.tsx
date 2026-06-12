'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import { listAuditApi, type AuditLogItem } from '@/lib/api-client';
import { useAuthStore, canViewAudit } from '@/stores/auth-store';
import { AUDIT_ACTION_LABELS } from '@/types';
import { Download, RefreshCw } from 'lucide-react';

function actionLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

function exportCsv(logs: AuditLogItem[]) {
  const headers = ['Date', 'Utilisateur', 'Email', 'Action', 'Entité', 'ID entité', 'IP'];
  const rows = logs.map((log) => [
    formatDate(log.createdAt),
    log.user ? `${log.user.firstName} ${log.user.lastName}` : '',
    log.user?.email ?? '',
    log.action,
    log.entity,
    log.entityId ?? '',
    log.ipAddress ?? '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-audax-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditPage() {
  const { user, permissions, accessToken } = useAuthStore();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError('');

    try {
      const data = await listAuditApi(accessToken);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : API_UNAVAILABLE_MESSAGE);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (canViewAudit(user?.role, permissions)) loadLogs();
  }, [user, permissions, loadLogs]);

  if (!canViewAudit(user?.role, permissions)) {
    return (
      <AuthGuard>
        <div className="p-8 text-center text-cream/50">Accès réservé aux administrateurs</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Journal d&apos;audit</h1>
            <p className="text-cream/50 text-sm">Traçabilité des actions sensibles</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={() => exportCsv(logs)} disabled={logs.length === 0}>
              <Download className="w-4 h-4" /> Exporter
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Card className="overflow-x-auto !p-0">
          {loading ? (
            <p className="p-8 text-center text-cream/40 text-sm">Chargement…</p>
          ) : logs.length === 0 && !error ? (
            <p className="p-8 text-center text-cream/40 text-sm">Aucune entrée dans le journal</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-carbon-700 text-left text-cream/40">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Utilisateur</th>
                  <th className="p-4 font-medium">Action</th>
                  <th className="p-4 font-medium">Entité</th>
                  <th className="p-4 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-carbon-800/50 hover:bg-carbon-800/30">
                    <td className="p-4 text-xs text-cream/50 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="p-4">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}
                      {log.user?.email && (
                        <p className="text-[10px] text-cream/30">{log.user.email}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs text-military-400" title={log.action}>
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="p-4">
                      {log.entity}
                      {log.entityId && <span className="text-cream/40"> ({log.entityId})</span>}
                    </td>
                    <td className="p-4 font-mono text-xs text-cream/40">{log.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AuthGuard>
  );
}
