'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-red-900/30 shadow-red-900/20">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-red-500">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-cream/60">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-4 border-t border-carbon-700/50">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-cream/40 hover:text-cream hover:bg-carbon-800"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20"
          >
            {loading ? 'Suppression...' : 'Confirmer la suppression'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
