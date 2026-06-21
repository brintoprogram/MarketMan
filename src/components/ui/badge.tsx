import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge demovida: virou ponto colorido 7px + texto pequeno em ink-2.
 * Sem pill gritante. Em casos especiais (status), aceita variant.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2 leading-none',
  {
    variants: {
      variant: {
        // Categorias de ativo — apenas ponto colorido + texto
        commodity: '',
        currency:  '',
        stock:     '',
        index:     '',
        crypto:    '',
        // Status semânticos — texto colorido (sem pill gritante)
        brand:     'text-brand-ink',
        success:   'text-up',
        danger:    'text-down',
        muted:     'text-ink-3'
      }
    },
    defaultVariants: { variant: 'muted' }
  }
);

const dotColor: Record<NonNullable<BadgeProps['variant']>, string> = {
  commodity: '#F59E0B',
  currency:  '#0EA5E9',
  stock:     '#8B5CF6',
  index:     '#8B5CF6',
  crypto:    '#D946EF',
  brand:     'var(--brand)',
  success:   'var(--up)',
  danger:    'var(--down)',
  muted:     'var(--ink-3)'
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Esconde o ponto colorido (deixa só o texto). */
  noDot?: boolean;
}

export function Badge({ className, variant, noDot, children, ...props }: BadgeProps) {
  const v = (variant ?? 'muted') as NonNullable<BadgeProps['variant']>;
  return (
    <span className={cn(badgeVariants({ variant: v, className }))} {...props}>
      {!noDot && (
        <span
          aria-hidden
          className="inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full"
          style={{ background: dotColor[v] }}
        />
      )}
      {children}
    </span>
  );
}

// Helpers legados — mantidos pra retrocompatibilidade com chamadas existentes
export function categoryVariant(category: string): NonNullable<BadgeProps['variant']> {
  if (category === 'commodity') return 'commodity';
  if (category === 'currency') return 'currency';
  if (category === 'stock') return 'stock';
  if (category === 'crypto') return 'crypto';
  if (category === 'index') return 'index';
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
