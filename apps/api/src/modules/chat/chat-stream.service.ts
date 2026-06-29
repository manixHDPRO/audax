import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface ChatStreamPayload {
  type: 'message' | 'read';
  conversationId: string;
  messageId?: string;
}

@Injectable()
export class ChatStreamService {
  private readonly events$ = new Subject<{ userId: string; payload: ChatStreamPayload }>();

  push(userId: string, payload: ChatStreamPayload) {
    this.events$.next({ userId, payload });
  }

  pushMany(userIds: string[], payload: ChatStreamPayload) {
    for (const userId of userIds) {
      this.push(userId, payload);
    }
  }

  streamFor(userId: string): Observable<MessageEvent> {
    return this.events$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: JSON.stringify(event.payload) })),
    );
  }
}
