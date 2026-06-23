import { cn } from '@/lib/utils';
import type { AudienceStatus, Priority } from '@/types';
import { STATUS_LABELS, PRIORITY_LABELS } from '@/types';

const statusStyles: Record<AudienceStatus, string> = {
  EN_ATTENTE: 'bg-amber-900/30 text-amber-400 border-amber-700/40',
  EN_ANALYSE: 'bg-blue-900/30 text-blue-400 border-blue-700/40',
  DEJA_ENVOYE: 'bg-indigo-900/30 text-indigo-300 border-indigo-700/40',
  TRANSMIS_DIRCAB: 'bg-gold-900/30 text-gold-300 border-gold-600/40',
  VALIDEE: 'bg-military-900/50 text-military-400 border-military-600/40',
  REJETEE: 'bg-red-900/30 text-red-400 border-red-700/40',
  PLANIFIEE: 'bg-purple-900/30 text-purple-400 border-purple-700/40',
  CONFIRMEE: 'bg-teal-900/30 text-teal-300 border-teal-700/40',
  TERMINEE: 'bg-carbon-700 text-cream/60 border-carbon-600',
  ARCHIVEE: 'bg-carbon-800 text-cream/40 border-carbon-700',
};

const priorityStyles: Record<Priority, string> = {
  PRIORITE_0: 'bg-carbon-800 text-cream/50 border border-carbon-600/50',
  NORMALE: 'bg-carbon-700 text-cream/70',
  URGENTE: 'bg-amber-900/40 text-amber-400',
  CRITIQUE: 'bg-red-900/50 text-red-400 glow-critical',
};

export function StatusBadge({ status, className }: { status: AudienceStatus; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300',
      statusStyles[status],
      className
    )}>
      <div className="w-1 h-1 rounded-full bg-current mr-1.5 opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-[0.1em] border transition-all duration-300',
      priorityStyles[priority],
      className
    )}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
