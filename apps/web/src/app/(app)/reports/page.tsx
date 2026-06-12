'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CHART_DATA, CATEGORY_DATA, MOCK_STATS } from '@/lib/mock-data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  const validationRate = Math.round(((MOCK_STATS.VALIDEE + MOCK_STATS.PLANIFIEE + MOCK_STATS.TERMINEE) / MOCK_STATS.total) * 100);

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rapports & Analytics</h1>
            <p className="text-cream/50 text-sm">Indicateurs stratégiques exécutifs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="gold"><FileSpreadsheet className="w-4 h-4" /> Export Excel</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Taux validation', value: `${validationRate}%` },
            { label: 'Total audiences', value: MOCK_STATS.total },
            { label: 'Rejetées', value: MOCK_STATS.REJETEE },
            { label: 'Terminées', value: MOCK_STATS.TERMINEE },
          ].map((s) => (
            <Card key={s.label} glow>
              <p className="text-xs text-cream/40 uppercase">{s.label}</p>
              <p className="text-2xl font-bold mt-2">{s.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Tendance mensuelle</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d4a2d33" />
                <XAxis dataKey="month" stroke="#f5f3eb66" fontSize={12} />
                <YAxis stroke="#f5f3eb66" fontSize={12} />
                <Tooltip contentStyle={{ background: '#121212', border: '1px solid #2d4a2d' }} />
                <Bar dataKey="audiences" fill="#4a7c4a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="validees" fill="#c9a227" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader><CardTitle>Répartition par catégorie</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                  {CATEGORY_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: '#121212', border: '1px solid #2d4a2d' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
