'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

const typeColors = {
  INFO: 'border-l-blue-500',
  SUCCESS: 'border-l-military-500',
  WARNING: 'border-l-amber-500',
  CRITICAL: 'border-l-red-500',
};

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Centre de notifications</h1>
          <Button variant="ghost" size="sm">Tout marquer comme lu</Button>
        </div>

        <div className="space-y-3">
          {MOCK_NOTIFICATIONS.map((n) => (
            <Card
              key={n.id}
              className={`!p-4 border-l-4 ${typeColors[n.type]} ${!n.isRead ? 'bg-military-900/10' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-cream/50 mt-1">{n.message}</p>
                  <p className="text-xs text-cream/30 mt-2">{formatDate(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-military-500 shrink-0 mt-2" />}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
