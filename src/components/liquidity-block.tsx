import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatVolumeBRL, formatCount } from '@/lib/format-extras';
import { Activity, BarChart3, Layers } from 'lucide-react';

interface Props {
  volumeBRL: number | null;
  trades: number | null;
  openInterest: number | null;
  oscillationPct: number | null;
  ohlc?: { open?: number | null; high?: number | null; low?: number | null; close?: number | null; settlement?: number | null } | null;
  unit: string | null;
  fetchedAt: string | null;
}

export function LiquidityBlock({ volumeBRL, trades, openInterest, oscillationPct, ohlc, unit, fetchedAt }: Props) {
  const isUsd = unit?.includes('USD') ?? false;
  const fmtPrice = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString(isUsd ? 'en-US' : 'pt-BR', {
    style: 'currency', currency: isUsd ? 'USD' : 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 4
  });

  if (volumeBRL == null && trades == null && openInterest == null && !ohlc) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-600" />
          Liquidez do último pregão
        </CardTitle>
        <CardDescription>
          Volume, número de negócios e contratos em aberto desse contrato vigente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<BarChart3 className="h-4 w-4" />} label="Volume (R$)" value={formatVolumeBRL(volumeBRL)} accent />
          <Stat icon={<Activity className="h-4 w-4" />} label="Negócios" value={formatCount(trades)} />
          <Stat icon={<Layers className="h-4 w-4" />} label="Open Interest" value={formatCount(openInterest)} />
          <Stat label="Oscilação" value={oscillationPct != null ? `${oscillationPct >= 0 ? '+' : ''}${Number(oscillationPct).toFixed(2)}%` : '—'} color={oscillationPct != null && oscillationPct >= 0 ? 'emerald' : 'rose'} />
        </div>

        {ohlc && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 border-t border-zinc-100 pt-4">
            <Stat label="Abertura" value={fmtPrice(ohlc.open)} mini />
            <Stat label="Máxima" value={fmtPrice(ohlc.high)} mini />
            <Stat label="Mínima" value={fmtPrice(ohlc.low)} mini />
            <Stat label="Fechamento" value={fmtPrice(ohlc.close)} mini />
            <Stat label="Ajuste" value={fmtPrice(ohlc.settlement)} mini hint="settlement" />
          </div>
        )}

        {fetchedAt && (
          <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-400">
            Coletado em {new Date(fetchedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value, accent, color, mini, hint }: {
  icon?: React.ReactNode; label: string; value: string;
  accent?: boolean; color?: 'emerald' | 'rose'; mini?: boolean; hint?: string;
}) {
  const colorCls = color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-zinc-900';
  return (
    <div className={`rounded-xl border ${accent ? 'border-brand-200/60 bg-brand-50/40' : 'border-zinc-200 bg-white'} p-3`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {icon}
        {label}
      </div>
      <div className={`${mini ? 'text-sm' : 'text-lg'} mt-1 font-bold tabular-nums tracking-tight ${colorCls}`}>{value}</div>
      {hint && <div className="text-[10px] text-zinc-400">{hint}</div>}
    </div>
  );
}
