import { Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 'md', withText = true }: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
}) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const boxSize  = size === 'sm' ? 'h-8 w-8'  : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  const text     = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn(
        'relative inline-flex items-center justify-center rounded-xl bg-gradient-brand text-white shadow-[0_4px_12px_-2px_rgb(16_185_129/0.45)] ring-1 ring-inset ring-white/20',
        boxSize
      )}>
        <Briefcase className={cn('drop-shadow-sm', iconSize)} strokeWidth={2.4} />
      </div>
      {withText && (
        <span className={cn('font-semibold tracking-tight text-zinc-900', text)}>
          MarketMan
        </span>
      )}
    </div>
  );
}
