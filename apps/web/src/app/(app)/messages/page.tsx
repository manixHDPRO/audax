'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, UserPlus, Loader2 } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isApiConfigured } from '@/lib/api-config';
import { useAuthStore } from '@/stores/auth-store';
import {
  createChatConversationApi,
  listChatContactsApi,
  listChatMessagesApi,
  listChatConversationsApi,
  markChatConversationReadApi,
  sendChatMessageApi,
  type ChatConversationSummary,
  type ChatMessageRecord,
  type ChatUserPreview,
} from '@/lib/api-client';
import { connectChatStream } from '@/lib/chat-stream';
import {
  formatChatPeerInitials,
  formatChatPeerName,
  useChatUnreadCount,
} from '@/hooks/use-chat';
import { ROLE_LABELS } from '@/types';

function formatMessageTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function MessagesPage() {
  const { accessToken, user } = useAuthStore();
  const { refreshUnreadCount } = useChatUnreadCount(accessToken);
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [contacts, setContacts] = useState<ChatUserPreview[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadConversations = useCallback(async () => {
    if (!accessToken || !isApiConfigured()) return;
    setLoadingList(true);
    try {
      const list = await listChatConversationsApi(accessToken);
      setConversations(list);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les conversations');
    } finally {
      setLoadingList(false);
    }
  }, [accessToken]);

  const loadContacts = useCallback(async () => {
    if (!accessToken || !isApiConfigured()) return;
    try {
      const list = await listChatContactsApi(accessToken);
      setContacts(list);
    } catch {
      setContacts([]);
    }
  }, [accessToken]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!accessToken) return;
      setLoadingMessages(true);
      try {
        const list = await listChatMessagesApi(accessToken, conversationId);
        setMessages(list);
        await markChatConversationReadApi(accessToken, conversationId);
        void refreshUnreadCount();
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger les messages');
      } finally {
        setLoadingMessages(false);
      }
    },
    [accessToken, refreshUnreadCount],
  );

  useEffect(() => {
    void loadConversations();
    void loadContacts();
  }, [loadConversations, loadContacts]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!accessToken || !isApiConfigured()) return;

    const disconnect = connectChatStream(accessToken, (event) => {
      if (event.type !== 'message') return;
      void loadConversations();
      if (event.conversationId === activeId) {
        void loadMessages(event.conversationId);
      }
    });

    return disconnect;
  }, [accessToken, activeId, loadConversations, loadMessages]);

  const handleStartConversation = async (recipientId: string) => {
    if (!accessToken) return;
    setShowNewChat(false);
    try {
      const conversation = await createChatConversationApi(accessToken, recipientId);
      await loadConversations();
      setActiveId(conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de démarrer la conversation');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !activeId || !draft.trim() || sending) return;

    setSending(true);
    const content = draft.trim();
    setDraft('');
    try {
      const message = await sendChatMessageApi(accessToken, activeId, content);
      setMessages((prev) => [...prev, message]);
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === activeId
              ? { ...c, lastMessage: message, updatedAt: message.createdAt }
              : c,
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    } catch (err) {
      setDraft(content);
      setError(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthGuard>
      <div className="p-4 lg:p-8 h-[calc(100vh-5rem)] max-w-6xl mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-military-900/60 border border-military-700/40 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-military-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">Messagerie</h1>
            <p className="text-sm text-cream/40">Communication interne entre utilisateurs Audax</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <div className="flex-1 min-h-0 grid lg:grid-cols-[320px_1fr] gap-4">
          <Card className="flex flex-col min-h-0 overflow-hidden !p-0">
            <div className="p-4 border-b border-military-800/30 flex items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cream/40">Conversations</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewChat((v) => !v)}>
                <UserPlus className="w-4 h-4 mr-1" />
                Nouveau
              </Button>
            </div>

            {showNewChat ? (
              <div className="border-b border-military-800/30 max-h-48 overflow-y-auto">
                {contacts.length ? (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => void handleStartConversation(contact.id)}
                      className="w-full text-left px-4 py-3 hover:bg-military-900/20 border-b border-military-900/20 transition-colors"
                    >
                      <p className="text-sm font-medium text-cream">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-[10px] text-cream/40 font-mono uppercase">
                        {ROLE_LABELS[contact.role as keyof typeof ROLE_LABELS] ?? contact.role}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="p-4 text-sm text-cream/40">Aucun contact disponible</p>
                )}
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-military-500" />
                </div>
              ) : conversations.length ? (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setActiveId(conversation.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-military-900/20 hover:bg-military-900/20 transition-colors',
                      activeId === conversation.id && 'bg-military-900/30 border-l-2 border-l-military-500',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-cream truncate">
                          {formatChatPeerName(conversation)}
                        </p>
                        <p className="text-xs text-cream/40 truncate mt-1">
                          {conversation.lastMessage?.content ?? 'Aucun message'}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 ? (
                        <span className="shrink-0 min-w-5 h-5 px-1 rounded-full bg-military-600 text-[10px] flex items-center justify-center font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))
              ) : (
                <p className="p-6 text-sm text-cream/40 text-center">
                  Aucune conversation. Cliquez sur « Nouveau » pour contacter un collègue.
                </p>
              )}
            </div>
          </Card>

          <Card className="flex flex-col min-h-0 overflow-hidden !p-0">
            {activeConversation ? (
              <>
                <div className="p-4 border-b border-military-800/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-military-700 to-military-900 flex items-center justify-center text-sm font-bold text-gold-400 border border-military-500/30">
                    {formatChatPeerInitials(activeConversation)}
                  </div>
                  <div>
                    <p className="font-medium">{formatChatPeerName(activeConversation)}</p>
                    <p className="text-[10px] text-cream/40 font-mono uppercase">
                      {activeConversation.participants[0]
                        ? ROLE_LABELS[
                            activeConversation.participants[0].role as keyof typeof ROLE_LABELS
                          ]
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-military-500" />
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isMine = message.sender.id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[80%] rounded-2xl px-4 py-2.5',
                              isMine
                                ? 'bg-military-700/40 border border-military-600/30 rounded-br-md'
                                : 'bg-carbon-900/60 border border-military-800/30 rounded-bl-md',
                            )}
                          >
                            <p className="text-sm text-cream whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <p className="text-[10px] text-cream/30 mt-1 text-right font-mono">
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-military-800/30 flex gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Écrire un message…"
                    maxLength={4000}
                    className="flex-1 h-11 px-4 rounded-xl bg-carbon-900/50 border border-military-800/50 text-cream focus:outline-none focus:border-military-500 text-sm"
                  />
                  <Button type="submit" disabled={sending || !draft.trim()} className="h-11 px-4">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-cream/30 p-8">
                <MessageSquare className="w-12 h-12 mb-4 opacity-40" />
                <p className="text-sm">Sélectionnez une conversation ou démarrez un nouvel échange</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
