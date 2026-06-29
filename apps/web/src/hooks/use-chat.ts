'use client';

import { useCallback, useEffect, useState } from 'react';
import { isApiConfigured } from '@/lib/api-config';
import {
  getChatUnreadCountApi,
  listChatConversationsApi,
  type ChatConversationSummary,
} from '@/lib/api-client';
import { connectChatStream } from '@/lib/chat-stream';

export function useChatUnreadCount(accessToken?: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!accessToken || !isApiConfigured()) {
      setUnreadCount(0);
      return;
    }
    try {
      const { count } = await getChatUnreadCountApi(accessToken);
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
    if (!accessToken || !isApiConfigured()) return;

    const interval = setInterval(() => void refresh(), 30000);
    const disconnect = connectChatStream(accessToken, () => {
      void refresh();
    });

    return () => {
      clearInterval(interval);
      disconnect();
    };
  }, [accessToken, refresh]);

  return { unreadCount, refreshUnreadCount: refresh };
}

export function formatChatPeerName(conversation: Pick<ChatConversationSummary, 'participants'>) {
  const peer = conversation.participants[0];
  if (!peer) return 'Conversation';
  return `${peer.firstName} ${peer.lastName}`;
}

export function formatChatPeerInitials(conversation: Pick<ChatConversationSummary, 'participants'>) {
  const peer = conversation.participants[0];
  if (!peer) return '?';
  return `${peer.firstName[0] ?? ''}${peer.lastName[0] ?? ''}`.toUpperCase();
}

export async function loadConversations(token: string) {
  return listChatConversationsApi(token);
}
