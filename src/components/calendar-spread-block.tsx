import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { describeSpread } from '@/lib/format-extras';

interface Props {
  spread: {
    front_symbol: string;
    front_price: number;
    next_symbol: string;
    next_price: number;
    spread_value: number;
    spread_pct: number;
    computed_at: string;
  } | null;
  unit: string | null;
}

export function CalendarSpreadBlock({ spread, unit }: Props) {
  if (!spread) return null;

  const isUsd = unit?.includes('USD') ?? false;
  const fmtPrice = (n: number) => n.toLocaleString(isUsd ? 'en-US' : 'pt-BR', {
    style: 'currency', currency: isUsd ? 'USD' : 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 4
  });

  const structure = describeSpread(spread.spread_value);
  const isContango = spread.spread_value > 0;
  const isBackwardation = spread.spread_value < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-600" />
          Calendar spread (M0 vs M+1)
        </CardTitle>
        <CardDescription>
          Diferença de preço entre o vencimento vigente e o seguinte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          {/* Front */}
          <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Vigente (M0)</div>
            <div className="mt-1 font-mono text-xs text-zinc-700">{spread.front_symbol}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-zinc-900">{fmtPrice(spread.front_price)}</div>
          </div>

          <ArrowRight className="h-5 w-5 flex-shrink-0 text-zinc-300" />

          {/* Next */}
          <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Próximo (M+1)</div>
            <div className="mt-1 font-mono text-xs text-zinc-700">{spread.next_symbol}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-zinc-900">{fmtPrice(spread.next_price)}</div>
          </div>
        </div>

        {/* Spread */}
        <div className={`mt-4 rounded-xl border p-4 ${
          isContango ? 'border-emerald-200 bg-emerald-50/40'
          : isBackwardation ? 'border-rose-200 bg-rose-50/40'
          : 'border-zinc-200 bg-zinc-50/40'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Estrutura</div>
                <Badge variant={structure.variant === 'success' ? 'success' : structure.variant === 'danger' ? 'danger' : 'muted'}>
                  {isContango ? <TrendingUp className="h-3 w-3" /> : isBackwardation ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {structure.label}
                </Badge>
              </div>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-600">{structure.hint}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold tabular-nums ${isContango ? 'text-emerald-700' : isBackwardation ? 'text-rose-700' : 'text-zinc-900'}`}>
                {spread.spread_value >= 0 ? '+' : ''}{fmtPrice(Math.abs(spread.spread_value)).replace(/[R$\s ]/g, '').replace(/^/, spread.spread_value >= 0 ? '+' : '−')}
              </div>
              <div className="text-xs text-zinc-500">
                {spread.spread_pct >= 0 ? '+' : ''}{Number(spread.spread_pct).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[10px] text-zinc-400">
          Calculado em {new Date(spread.computed_at).toLocaleString('pt-BR')}
        </p>
      </CardContent>
    </Card>
  );
}
