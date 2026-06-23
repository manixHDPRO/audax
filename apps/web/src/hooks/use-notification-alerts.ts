'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiConfigured } from '@/lib/api-config';
import { listNotificationsApi, type NotificationApiRecord } from '@/lib/api-client';
import { connectNotificationStream } from '@/lib/notification-stream';
import {
  playNotificationSound,
  readNotificationSoundPreferences,
  type NotificationSoundType,
} from '@/lib/notification-sounds';
import { subscribeAudienceSync } from '@/lib/audience-sync-bus';
import type { UserRole } from '@/types';

interface UseNotificationAlertsOptions {
  accessToken?: string | null;
  userId?: string | null;
  userRole?: UserRole | null;
  pollIntervalMs?: number;
}

function toSoundType(type: string): NotificationSoundType {
  if (type === 'SUCCESS' || type === 'WARNING' || type === 'CRITICAL') return type;
  return 'INFO';
}

export function useNotificationAlerts({
  accessToken,
  userId,
  userRole,
  pollIntervalMs = 30000,
}: UseNotificationAlertsOptions) {
  const [unreadCount, setUnreadCount] = useState(0);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const playForUser = useCallback(
    (type: NotificationSoundType) => {
      if (!userId) return;
      const preferences = readNotificationSoundPreferences(userId);
      playNotificationSound(type, preferences);
    },
    [userId],
  );

  const handleNotifications = useCallback(
    (list: NotificationApiRecord[], playNewSounds: boolean) => {
      const unread = list.filter((n) => !n.isRead);
      setUnreadCount(unread.length);

      if (!userId) {
        knownIdsRef.current = new Set(list.map((n) => n.id));
        initializedRef.current = true;
        return;
      }

      if (playNewSounds && initializedRef.current) {
        const preferences = readNotificationSoundPreferences(userId);
        for (const notification of unread) {
          if (!knownIdsRef.current.has(notification.id)) {
            playNotificationSound(toSoundType(notification.type), preferences);
          }
        }
      }

      knownIdsRef.current = new Set(list.map((n) => n.id));
      initializedRef.current = true;
    },
    [userId],
  );

  const refreshNotifications = useCallback(
    async (playNewSounds = true) => {
      if (!accessToken || !isApiConfigured()) {
        setUnreadCount(0);
        knownIdsRef.current = new Set();
        initializedRef.current = false;
        return;
      }

      try {
        const list = await listNotificationsApi(accessToken);
        handleNotifications(list, playNewSounds);
      } catch {
        setUnreadCount(0);
      }
    },
    [accessToken, handleNotifications],
  );

  useEffect(() => {
    if (!accessToken || !isApiConfigured()) {
      setUnreadCount(0);
      knownIdsRef.current = new Set();
      initializedRef.current = false;
      return;
    }

    let cancelled = false;

    const run = async (playNewSounds = false) => {
      if (cancelled) return;
      await refreshNotifications(playNewSounds);
    };

    void run(false);
    // Repli si le flux SSE est indisponible : détecter les nouvelles notifications en base.
    const interval = setInterval(() => void run(true), pollIntervalMs);

    const unsubscribeSync = subscribeAudienceSync((event) => {
      if (userRole && event.alertRoles?.includes(userRole)) {
        const soundType =
          event.alertSoundByRole?.[userRole] ?? event.soundType ?? 'INFO';
        playForUser(soundType);
      }
      window.setTimeout(() => {
        void run(true);
      }, event.type === 'created' ? 200 : 100);
    });

    const disconnectStream = connectNotificationStream(accessToken, (payload) => {
      playForUser(payload.type);
      void refreshNotifications(true);
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribeSync();
      disconnectStream();
    };
  }, [accessToken, pollIntervalMs, playForUser, refreshNotifications, userRole]);

  useEffect(() => {
    knownIdsRef.current = new Set();
    initializedRef.current = false;
  }, [userId]);

  return { unreadCount, refreshNotifications };
}
