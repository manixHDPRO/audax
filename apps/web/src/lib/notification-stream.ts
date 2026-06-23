import { API_BASE_URL } from './api-config';
import type { NotificationSoundType } from './notification-sounds';

export interface NotificationPushPayload {
  type: NotificationSoundType;
  title: string;
  message?: string;
  audienceId?: string;
}

function parseSseBlock(block: string): NotificationPushPayload | null {
  const dataLine = block
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('data:'));

  if (!dataLine) return null;

  try {
    return JSON.parse(dataLine.replace(/^data:\s?/, '')) as NotificationPushPayload;
  } catch {
    return null;
  }
}

export function connectNotificationStream(
  token: string,
  onMessage: (payload: NotificationPushPayload) => void,
): () => void {
  const controller = new AbortController();
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const connect = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok || !response.body) {
        throw new Error('Notification stream unavailable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!controller.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const payload = parseSseBlock(block);
          if (payload) onMessage(payload);
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        retryTimer = setTimeout(() => {
          void connect();
        }, 3000);
      }
    }
  };

  void connect();

  return () => {
    controller.abort();
    if (retryTimer) clearTimeout(retryTimer);
  };
}
