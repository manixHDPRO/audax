'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { isApiConfigured, API_UNAVAILABLE_MESSAGE } from '@/lib/api-config';
import {
  getDashboardReportsApi,
  type DashboardReportsResponse,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const CATEGORY_COLORS = [
  '#4a7c4a',
  '#c9a227',
  '#6b9f6b',
  '#2d4a2d',
  '#8b7355',
  '#5a7a9a',
  '#9a5a5a',
];

const CATEGORY_LABELS: Record<string, string> = {
  MILITAIRE: 'Militaire',
  DIPLOMATIQUE: 'Diplomatique',
  CIVIL: 'Civil',
  INSTITUTIONNEL: 'Institutionnel',
  AUTRE: 'Autre',
};

export default function ReportsPage() {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<DashboardReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!accessToken || !isApiConfigured()) {
      setLoading(false);
      setError(API_UNAVAILABLE_MESSAGE);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const reports = await getDashboardReportsApi(accessToken);
      setData(reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : API_UNAVAILABLE_MESSAGE);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const categoryData = useMemo(() => {
    if (!data?.byCategory.length) return [];
    return data.byCategory.map((row, index) => ({
      name: CATEGORY_LABELS[row.name] ?? row.name,
      value: row.value,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [data]);

  const chartData = data?.byMonth ?? [];
  const stats = data?.stats;

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Rapports & Analytics</h1>
          <p className="text-cream/50 text-sm">Indicateurs stratégiques — données en direct</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-cream/40 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Chargement des rapports…
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Taux validation', value: `${data.validationRate}%` },
                { label: 'Total audiences', value: data.total },
                { label: 'Rejetées', value: stats?.REJETEE ?? 0 },
                { label: 'Terminées', value: stats?.TERMINEE ?? 0 },
              ].map((s) => (
                <Card key={s.label} glow>
                  <p className="text-xs text-cream/40 uppercase">{s.label}</p>
                  <p className="text-2xl font-bold mt-2">{s.value}</p>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tendance (6 derniers mois)</CardTitle>
                </CardHeader>
                {chartData.every((row) => row.audiences === 0) ? (
                  <p className="text-sm text-cream/40 py-16 text-center">
                    Aucune audience sur la période.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d4a2d33" />
                      <XAxis dataKey="month" stroke="#f5f3eb66" fontSize={12} />
                      <YAxis stroke="#f5f3eb66" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: '#121212', border: '1px solid #2d4a2d' }}
                      />
                      <Bar dataKey="audiences" name="Créées" fill="#4a7c4a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="validees" name="Validées+" fill="#c9a227" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition par catégorie</CardTitle>
                </CardHeader>
                {categoryData.length === 0 ? (
                  <p className="text-sm text-cream/40 py-16 text-center">
                    Aucune catégorie à afficher.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label
                      >
                        {categoryData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip
                        contentStyle={{ background: '#121212', border: '1px solid #2d4a2d' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </AuthGuard>
  );
}
