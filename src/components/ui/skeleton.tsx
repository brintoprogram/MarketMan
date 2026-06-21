import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton — barra/bloco com shimmer entre --line e --line-strong.
 * Use pra qualquer carregamento de dado: cards, listas, detalhes, logs.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />;
}
