'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { isApiConfigured } from '@/lib/api-config';
import { useAuthStore } from '@/stores/auth-store';
import {
  listNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  type NotificationApiRecord,
} from '@/lib/api-client';
import { subscribeAudienceSync } from '@/lib/audience-sync-bus';

const typeColors = {
  INFO: 'border-l-blue-500',
  SUCCESS: 'border-l-military-500',
  WARNING: 'border-l-amber-500',
  CRITICAL: 'border-l-red-500',
};

export default function NotificationsPage() {
  const { accessToken } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async (silent = false) => {
    if (!accessToken || !isApiConfigured()) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const list = await listNotificationsApi(accessToken);
      setNotifications(list);
      setError('');
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Impossible de charger les notifications');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!accessToken) return;
    const unsubscribe = subscribeAudienceSync(() => {
      void loadNotifications(true);
    });
    return unsubscribe;
  }, [accessToken, loadNotifications]);

  const handleMarkAllRead = async () => {
    if (!accessToken) return;
    await markAllNotificationsReadApi(accessToken);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkRead = async (id: string) => {
    if (!accessToken) return;
    await markNotificationReadApi(accessToken, id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Centre de notifications</h1>
            <p className="text-sm text-cream/40 mt-1">
              Audiences qui vous concernent directement ou dans votre périmètre
            </p>
          </div>
          {notifications.some((n) => !n.isRead) ? (
            <Button variant="ghost" size="sm" onClick={() => void handleMarkAllRead()}>
              Tout marquer comme lu
            </Button>
          ) : null}
        </div>

        {loading ? (
          <Card className="text-center py-12 text-cream/40">Chargement…</Card>
        ) : error ? (
          <Card className="text-center py-12 text-red-400/80">{error}</Card>
        ) : notifications.length === 0 ? (
          <Card className="text-center py-12 text-cream/40">
            Aucune notification pour une audience qui vous concerne.
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const content = (
                <Card
                  className={`!p-4 border-l-4 ${typeColors[n.type]} ${!n.isRead ? 'bg-military-900/10' : ''}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-sm text-cream/50 mt-1">{n.message}</p>
                      <p className="text-xs text-cream/30 mt-2">{formatDate(n.createdAt)}</p>
                    </div>
                    {!n.isRead ? (
                      <span className="w-2 h-2 rounded-full bg-military-500 shrink-0 mt-2" />
                    ) : null}
                  </div>
                </Card>
              );

              if (n.link) {
                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      if (!n.isRead) void handleMarkRead(n.id);
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                );
              }

              return <div key={n.id}>{content}</div>;
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
