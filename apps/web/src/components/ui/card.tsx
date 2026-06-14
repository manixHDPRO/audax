import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  tactical?: boolean;
  scanlines?: boolean;
}

export function Card({ className, glow, tactical, scanlines, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'glass rounded-xl p-6 transition-all duration-300',
        glow && 'glow-green-strong border-military-600/30',
        tactical && 'tactical-corners',
        scanlines && 'scanlines',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 mb-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-cream tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-cream/50', className)} {...props} />;
}
