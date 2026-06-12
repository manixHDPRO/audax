'use client';

import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  loading = false,
  loadingLabel = 'Traitement…',
  variant = 'destructive',
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const isDestructive = variant === 'destructive';

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent
        className={cn(
          'max-w-md p-0 overflow-hidden',
          isDestructive ? 'border-red-900/50 glow-critical' : 'border-military-700/30',
        )}
      >
        <div
          className={cn(
            'h-1 w-full',
            isDestructive
              ? 'bg-gradient-to-r from-transparent via-red-500/80 to-transparent'
              : 'bg-gradient-to-r from-transparent via-military-500/60 to-transparent',
          )}
        />

        <div className="p-6 space-y-5">
          <div className="flex gap-4 items-start">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border',
                isDestructive
                  ? 'bg-red-950/60 border-red-800/50 text-red-400'
                  : 'bg-military-900/50 border-military-700/40 text-military-400',
              )}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogHeader className="mb-0 text-left space-y-2">
              <DialogTitle className={isDestructive ? 'text-red-300' : undefined}>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          </div>

          {children}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={isDestructive ? 'destructive' : 'default'}
              className="flex-1"
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? loadingLabel : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
