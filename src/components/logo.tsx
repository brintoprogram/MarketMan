import { Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({
  className,
  size = 'md',
  withText = true
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
}) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const boxSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const text = size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-xl' : 'text-[17px]';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'relative inline-flex items-center justify-center rounded-md bg-brand text-white',
          'ring-1 ring-inset ring-white/15',
          'shadow-[0_2px_8px_rgba(16,185,129,0.32)]',
          boxSize
        )}
      >
        <Briefcase className={cn(iconSize)} strokeWidth={2.4} />
      </div>
      {withText && (
        <span className={cn('font-semibold tracking-tight text-ink', text)}>
          MarketMan
        </span>
      )}
    </div>
  );
}
