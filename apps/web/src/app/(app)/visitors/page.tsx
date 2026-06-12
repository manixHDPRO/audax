'use client';

import { QrCode, UserPlus } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MOCK_VISITORS } from '@/lib/mock-data';

export default function VisitorsPage() {
  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gestion des visiteurs</h1>
          <Button><UserPlus className="w-4 h-4" /> Nouveau visiteur</Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_VISITORS.map((v) => (
            <Card key={v.id} className="hover:border-military-600/30 transition-colors">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-xl bg-military-800 flex items-center justify-center text-lg font-bold text-gold-400 shrink-0">
                  {v.firstName[0]}{v.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{v.firstName} {v.lastName}</p>
                  <p className="text-xs text-cream/40">{v.organization}</p>
                  <p className="text-xs text-cream/30 mt-1">{v.function}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-carbon-700 uppercase">{v.accessLevel}</span>
                    {v.badgeCode && (
                      <span className="text-[10px] font-mono text-military-400 flex items-center gap-1">
                        <QrCode className="w-3 h-3" /> {v.badgeCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
