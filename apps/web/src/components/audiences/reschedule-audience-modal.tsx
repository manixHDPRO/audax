'use client';

import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { rescheduleApi } from '@/lib/api-client';
import { mapApiAudience } from '@/lib/audience-utils';
import type { Audience } from '@/types';

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultScheduleValue(currentScheduledAt?: string) {
  if (currentScheduledAt) {
    return toDatetimeLocalValue(new Date(currentScheduledAt));
  }
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return toDatetimeLocalValue(next);
}

interface RescheduleAudienceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: Audience;
  accessToken: string;
  onSuccess: (audience: Audience) => void;
}

export function RescheduleAudienceModal({
  open,
  onOpenChange,
  audience,
  accessToken,
  onSuccess,
}: RescheduleAudienceModalProps) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setScheduledAt(defaultScheduleValue(audience.scheduledAt));
      setError('');
    }
  }, [open, audience.scheduledAt]);

  const handleSubmit = async () => {
    if (!scheduledAt) {
      setError('Choisissez une date et une heure');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const iso = new Date(scheduledAt).toISOString();
      const result = await rescheduleApi(accessToken, audience.id, iso);
      onSuccess(mapApiAudience(result.audience));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de reprogrammer cette audience');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="max-w-md border-military-700/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-military-400" />
            Réprogrammer l&apos;audience
          </DialogTitle>
          <DialogDescription>
            {audience.reference} — {audience.subject}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="reschedule-at" className="text-xs text-cream/50 uppercase tracking-wider">
              Nouvelle date et heure
            </label>
            <input
              id="reschedule-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-2 w-full h-10 px-3 rounded-xl bg-carbon-800 border border-carbon-600 text-sm focus:outline-none focus:border-military-500"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={loading}>
              {loading ? 'Enregistrement…' : 'Confirmer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
