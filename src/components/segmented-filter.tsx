'use client';

import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function SegmentedFilter({ options, value, onChange, className }: Props) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-md border border-line bg-panel p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition',
              active
                ? 'bg-ink text-bg shadow-card'
                : 'text-ink-2 hover:bg-brand-soft hover:text-brand-ink'
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'num text-[10.5px]',
                  active ? 'text-bg/80' : 'text-ink-3'
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
