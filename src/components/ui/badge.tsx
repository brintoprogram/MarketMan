import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
  {
    variants: {
      variant: {
        commodity: 'bg-amber-50 text-amber-800 ring-amber-200/60',
        currency:  'bg-sky-50 text-sky-800 ring-sky-200/60',
        stock:     'bg-violet-50 text-violet-800 ring-violet-200/60',
        crypto:    'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200/60',
        index:     'bg-zinc-100 text-zinc-700 ring-zinc-200/60',
        brand:     'bg-brand-50 text-brand-800 ring-brand-200/60',
        muted:     'bg-zinc-100 text-zinc-600 ring-zinc-200/60',
        success:   'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
        danger:    'bg-rose-50 text-rose-700 ring-rose-200/60'
      }
    },
    defaultVariants: { variant: 'muted' }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export function categoryVariant(category: string): NonNullable<BadgeProps['variant']> {
  if (category === 'commodity') return 'commodity';
  if (category === 'currency') return 'currency';
  if (category === 'stock') return 'stock';
  if (category === 'crypto') return 'crypto';
  return 'muted';
}

export function categoryLabel(category: string): string {
  if (category === 'commodity') return 'Commodity';
  if (category === 'currency') return 'Moeda';
  if (category === 'stock') return 'Ação';
  if (category === 'crypto') return 'Cripto';
  if (category === 'index') return 'Índice';
  return category;
}
