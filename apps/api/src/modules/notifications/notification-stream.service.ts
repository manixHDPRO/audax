import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export type NotificationSoundType = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface NotificationPushPayload {
  type: NotificationSoundType;
  title: string;
  message?: string;
  audienceId?: string;
}

@Injectable()
export class NotificationStreamService {
  private readonly events$ = new Subject<{ userId: string; payload: NotificationPushPayload }>();

  push(userId: string, payload: NotificationPushPayload) {
    this.events$.next({ userId, payload });
  }

  pushMany(userIds: string[], payload: NotificationPushPayload) {
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
