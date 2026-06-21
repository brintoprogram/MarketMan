import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface AssetCardData {
  id: string;
  symbol: string;
  name: string;
  category: 'commodity' | 'currency' | 'stock' | 'index' | 'crypto' | string;
  unit?: string | null;
  price?: number | null;
  pct?: number | null;          // variação 7d em %
  sparkline?: number[];          // pontos pra sparkline (ascendente)
  fetchedAt?: string | null;     // timestamp da última cotação
}

const CATEGORY_DOT: Record<string, string> = {
  commodity: '#F59E0B',
  currency:  '#0EA5E9',
  stock:     '#8B5CF6',
  index:     '#8B5CF6',
  crypto:    '#D946EF'
};

const CATEGORY_LABEL: Record<string, string> = {
  commodity: 'Commodity',
  currency:  'Moeda',
  stock:     'Ação',
  index:     'Índice',
  crypto:    'Cripto'
};

export function AssetCard({ data, href }: { data: AssetCardData; href: string }) {
  const { symbol, name, category, unit, price, pct, sparkline, fetchedAt } = data;
  const positive = (pct ?? 0) >= 0;
  const isUsd = unit?.includes('USD') ?? false;
  const hasData = price != null && Number.isFinite(price);

  return (
    <Link
      href={href}
      className="group relative block rounded-xl border border-line bg-panel p-4 shadow-card card-hover"
    >
      {/* Top: dot + ticker + categoria + seta */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-2">
          <span
            aria-hidden
            className="inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full"
            style={{ background: CATEGORY_DOT[category] ?? 'var(--ink-3)' }}
          />
          <span className="num font-semibold uppercase tracking-wider text-ink">{symbol}</span>
          <span className="text-ink-3">·</span>
          <span>{CATEGORY_LABEL[category] ?? category}</span>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-ink-3 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-ink" />
      </div>

      {/* Nome */}
      <h3 className="mb-3 text-[13px] font-medium leading-tight text-ink-2">
        {name}
      </h3>

      {/* Preço + chip + sparkline */}
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {hasData ? (
            <div className="num text-[26px] font-semibold leading-none tracking-tight text-ink">
              {formatPrice(price as number, isUsd ? 'USD' : 'BRL')}
            </div>
          ) : (
            <Skeleton className="h-7 w-32" />
          )}
          {pct != null && hasData && (
            <div className="mt-2">
              <PctChip pct={pct} positive={positive} />
            </div>
          )}
        </div>
        {sparkline && sparkline.length >= 2 ? (
          <Sparkline points={sparkline} positive={positive} height={36} width={96} />
        ) : (
          <Skeleton style={{ height: 22, width: 96 }} />
        )}
      </div>

      {/* Footer: status + unidade */}
      <div className="flex items-center justify-between border-t border-line pt-3 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          {fetchedAt ? (
            <>
              <span className="dot-active" />
              <span>Atualizado <span className="num">{relativeTime(fetchedAt)}</span></span>
            </>
          ) : (
            <span className="text-ink-3">Sem dados</span>
          )}
        </span>
        {unit && <span className="num">{unit}</span>}
      </div>
    </Link>
  );
}

function PctChip({ pct, positive }: { pct: number; positive: boolean }) {
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
        positive ? 'bg-up-soft text-up' : 'bg-down-soft text-down'
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="num">
        {positive ? '+' : ''}
        {pct.toFixed(2)}%
      </span>
    </span>
  );
}

export function AssetCardEmpty({ href, symbol, name, category, unit }: {
  href: string;
  symbol: string;
  name: string;
  category: string;
  unit?: string | null;
}) {
  return (
    <Link
      href={href}
      className="group relative block rounded-xl border border-line bg-panel p-4 shadow-card card-hover"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-2">
          <span
            aria-hidden
            className="inline-block h-[7px] w-[7px] rounded-full"
            style={{ background: CATEGORY_DOT[category] ?? 'var(--ink-3)' }}
          />
          <span className="num font-semibold uppercase tracking-wider text-ink">{symbol}</span>
          <span className="text-ink-3">·</span>
          <span>{CATEGORY_LABEL[category] ?? category}</span>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-ink-3" />
      </div>
      <h3 className="mb-4 text-[13px] font-medium leading-tight text-ink-2">{name}</h3>

      <div className="mb-4 space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3 text-[11px] text-ink-3">
        <span>Aguardando 1ª coleta</span>
        {unit && <span className="num">{unit}</span>}
      </div>
    </Link>
  );
}
