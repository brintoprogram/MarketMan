'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart, type IChartApi, type Time, LineStyle, ColorType, CrosshairMode
} from 'lightweight-charts';
import { sma, rsi, bollinger, pearsonCorrelation, alignSeries, classifyRsi, correlationLabel } from '@/lib/indicators';
import { Repeat, Activity } from 'lucide-react';

export interface PricePoint { time: number; price: number; }

export interface CompareAsset {
  id: string;
  symbol: string;
  name: string;
  unit?: string | null;
  data: PricePoint[];
}

interface Props {
  data: PricePoint[];
  unit?: string | null;
  className?: string;
  height?: number;
  compareAssets?: CompareAsset[];
}

type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
type IndicatorKey = 'sma21' | 'sma50' | 'sma200' | 'bb';

const TIMEFRAMES: { label: Timeframe; seconds: number | null }[] = [
  { label: '1D',  seconds: 24 * 3600 },
  { label: '1W',  seconds: 7 * 24 * 3600 },
  { label: '1M',  seconds: 30 * 24 * 3600 },
  { label: '3M',  seconds: 90 * 24 * 3600 },
  { label: '6M',  seconds: 180 * 24 * 3600 },
  { label: '1Y',  seconds: 365 * 24 * 3600 },
  { label: 'ALL', seconds: 5 * 365 * 24 * 3600 }
];

const INDICATOR_META: Record<IndicatorKey, { label: string; color: string; tooltip: string }> = {
  sma21:  { label: 'MM21',  color: '#f59e0b', tooltip: 'Média móvel simples de 21 períodos' },
  sma50:  { label: 'MM50',  color: '#3b82f6', tooltip: 'Média móvel simples de 50 períodos' },
  sma200: { label: 'MM200', color: '#8b5cf6', tooltip: 'Média móvel simples de 200 períodos — tendência de longo prazo' },
  bb:     { label: 'BB',    color: '#6b7280', tooltip: 'Bandas de Bollinger (20, 2) — volatilidade' }
};

export function PriceChart({ data, unit, className, height = 360, compareAssets }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(new Set());
  const [showRsi, setShowRsi] = useState(false);
  const [overlayId, setOverlayId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data || data.length === 0) return [];
    const tf = TIMEFRAMES.find((t) => t.label === timeframe);
    if (!tf?.seconds) return data;
    const cutoff = Date.now() / 1000 - tf.seconds;
    return data.filter((p) => p.time >= cutoff);
  }, [data, timeframe]);

  const overlayAsset = useMemo(() => compareAssets?.find((a) => a.id === overlayId) ?? null, [compareAssets, overlayId]);
  const overlayFiltered = useMemo(() => {
    if (!overlayAsset) return null;
    const tf = TIMEFRAMES.find((t) => t.label === timeframe);
    if (!tf?.seconds) return overlayAsset.data;
    const cutoff = Date.now() / 1000 - tf.seconds;
    return overlayAsset.data.filter((p) => p.time >= cutoff);
  }, [overlayAsset, timeframe]);

  const stats = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0].price;
    const last = filtered[filtered.length - 1].price;
    const min = Math.min(...filtered.map((p) => p.price));
    const max = Math.max(...filtered.map((p) => p.price));
    const pct = first ? ((last - first) / first) * 100 : 0;
    return { first, last, min, max, pct };
  }, [filtered]);

  // RSI calculado sobre a janela visível
  const rsiSeries = useMemo(() => {
    if (!filtered.length) return [];
    const values = filtered.map((p) => p.price);
    const out = rsi(values, 14);
    return out.map((v, i) => ({ time: filtered[i].time, value: v })).filter((p) => p.value != null) as { time: number; value: number }[];
  }, [filtered]);
  const lastRsi = rsiSeries.length ? rsiSeries[rsiSeries.length - 1].value : null;
  const rsiClass = classifyRsi(lastRsi);

  // correlação sobre intersecção temporal
  const correlation = useMemo(() => {
    if (!overlayFiltered) return null;
    const aligned = alignSeries(filtered, overlayFiltered);
    if (aligned.a.length < 5) return null;
    return pearsonCorrelation(aligned.a, aligned.b);
  }, [filtered, overlayFiltered]);

  const positive = (stats?.pct ?? 0) >= 0;
  const mainColor = positive ? '#059669' : '#e11d48';
  const fillTop   = positive ? 'rgba(16,185,129,0.20)' : 'rgba(244,63,94,0.20)';
  const fillBottom = positive ? 'rgba(16,185,129,0.00)' : 'rgba(244,63,94,0.00)';

  // ============= main chart =============
  useEffect(() => {
    if (!containerRef.current || filtered.length < 2) return;

    const chart = createChart(containerRef.current, {
      height,
      width: containerRef.current.clientWidth,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#52525b',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        fontSize: 11
      },
      grid: {
        vertLines: { color: 'rgba(0,0,0,0.04)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(0,0,0,0.06)' }
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: '#a1a1aa', width: 1, style: LineStyle.Solid, labelBackgroundColor: '#18181b' },
        horzLine: { color: '#a1a1aa', width: 1, style: LineStyle.Solid, labelBackgroundColor: '#18181b' }
      },
      rightPriceScale: { borderColor: 'rgba(0,0,0,0.06)', scaleMargins: { top: 0.1, bottom: 0.06 } },
      leftPriceScale: overlayFiltered ? { visible: true, borderColor: 'rgba(0,0,0,0.06)' } : undefined,
      timeScale: {
        borderColor: 'rgba(0,0,0,0.06)',
        timeVisible: timeframe === '1D' || timeframe === '1W',
        secondsVisible: false
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisDoubleClickReset: { time: true, price: true } }
    });

    // main area series
    const main = chart.addAreaSeries({
      lineColor: mainColor, lineWidth: 2,
      topColor: fillTop, bottomColor: fillBottom,
      priceLineVisible: true, priceLineColor: mainColor, priceLineWidth: 1, priceLineStyle: LineStyle.Dashed,
      lastValueVisible: true,
      crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: mainColor, crosshairMarkerBackgroundColor: '#ffffff'
    });
    main.setData(filtered.map((p) => ({ time: p.time as Time, value: p.price })));

    // Indicadores: SMAs e Bollinger
    if (filtered.length > 5) {
      const closes = filtered.map((p) => p.price);

      if (activeIndicators.has('sma21')) {
        const s = sma(closes, 21);
        const series = chart.addLineSeries({ color: INDICATOR_META.sma21.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: 'MM21' });
        series.setData(s.map((v, i) => v == null ? null : ({ time: filtered[i].time as Time, value: v })).filter(Boolean) as any);
      }
      if (activeIndicators.has('sma50')) {
        const s = sma(closes, 50);
        const series = chart.addLineSeries({ color: INDICATOR_META.sma50.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: 'MM50' });
        series.setData(s.map((v, i) => v == null ? null : ({ time: filtered[i].time as Time, value: v })).filter(Boolean) as any);
      }
      if (activeIndicators.has('sma200')) {
        const s = sma(closes, 200);
        const series = chart.addLineSeries({ color: INDICATOR_META.sma200.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: 'MM200' });
        series.setData(s.map((v, i) => v == null ? null : ({ time: filtered[i].time as Time, value: v })).filter(Boolean) as any);
      }
      if (activeIndicators.has('bb')) {
        const { upper, middle, lower } = bollinger(closes, 20, 2);
        const upperS = chart.addLineSeries({ color: INDICATOR_META.bb.color, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, title: 'BB sup.' });
        const middleS = chart.addLineSeries({ color: INDICATOR_META.bb.color, lineWidth: 1, lineStyle: LineStyle.Solid, priceLineVisible: false, lastValueVisible: false, title: 'BB méd.' });
        const lowerS = chart.addLineSeries({ color: INDICATOR_META.bb.color, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, title: 'BB inf.' });
        upperS.setData(upper.map((v, i) => v == null ? null : ({ time: filtered[i].time as Time, value: v })).filter(Boolean) as any);
        middleS.setData(middle.map((v, i) => v == null ? null : ({ time: filtered[i].time as Time, value: v })).filter(Boolean) as any);
        lowerS.setData(lower.map((v, i) => v == null ? null : ({ time: filtered[i].time as Time, value: v })).filter(Boolean) as any);
      }
    }

    // overlay no eixo esquerdo
    if (overlayFiltered && overlayFiltered.length > 1) {
      const overlay = chart.addLineSeries({
        color: '#0ea5e9',
        lineWidth: 2,
        priceScaleId: 'left',
        priceLineVisible: false,
        lastValueVisible: true,
        title: overlayAsset?.symbol ?? ''
      });
      overlay.setData(overlayFiltered.map((p) => ({ time: p.time as Time, value: p.price })));
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [filtered, height, mainColor, fillTop, fillBottom, timeframe, activeIndicators, overlayFiltered, overlayAsset]);

  // ============= RSI mini chart =============
  useEffect(() => {
    if (!showRsi || !rsiContainerRef.current || rsiSeries.length < 5) return;

    const chart = createChart(rsiContainerRef.current, {
      height: 110,
      width: rsiContainerRef.current.clientWidth,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#52525b', fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: 10
      },
      grid: {
        vertLines: { color: 'rgba(0,0,0,0.03)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(0,0,0,0.05)' }
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderColor: 'rgba(0,0,0,0.06)', scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: 'rgba(0,0,0,0.06)', timeVisible: false }
    });

    const series = chart.addLineSeries({ color: '#a855f7', lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
    series.setData(rsiSeries.map((p) => ({ time: p.time as Time, value: p.value })));

    // linhas de referência 30 e 70
    series.createPriceLine({ price: 70, color: 'rgba(225, 29, 72, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '70' });
    series.createPriceLine({ price: 30, color: 'rgba(5, 150, 105, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '30' });
    series.createPriceLine({ price: 50, color: 'rgba(0,0,0,0.15)', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (rsiContainerRef.current) chart.applyOptions({ width: rsiContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, [rsiSeries, showRsi]);

  const fmtPrice = (n: number) => {
    const usd = unit?.includes('USD');
    return n.toLocaleString(usd ? 'en-US' : 'pt-BR', {
      style: 'currency', currency: usd ? 'USD' : 'BRL',
      minimumFractionDigits: 2, maximumFractionDigits: 4
    });
  };

  function toggleIndicator(k: IndicatorKey) {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  const corrColor = correlation == null ? 'bg-zinc-100 text-zinc-600'
    : correlation > 0.5 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
    : correlation < -0.5 ? 'bg-rose-50 text-rose-700 ring-rose-200/60'
    : 'bg-zinc-100 text-zinc-700 ring-zinc-200/60';

  return (
    <div className={className}>
      {/* Stats row */}
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
        {stats && (
          <>
            <Stat label="Variação" value={`${stats.pct >= 0 ? '+' : ''}${stats.pct.toFixed(2)}%`} color={positive ? 'emerald' : 'rose'} />
            <Stat label="Mínima" value={fmtPrice(stats.min)} />
            <Stat label="Máxima" value={fmtPrice(stats.max)} />
            <Stat label="Pontos" value={String(filtered.length)} />
            {lastRsi != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">RSI (14)</span>
                <span className={`font-semibold tabular-nums ${rsiClass.cls}`}>
                  {lastRsi.toFixed(1)}
                </span>
                <span className={`text-[10px] ${rsiClass.cls}`}>· {rsiClass.label}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls row */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Timeframes */}
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-soft">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setTimeframe(tf.label)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                timeframe === tf.label ? 'bg-brand-600 text-white shadow-soft' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Indicators + RSI */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['sma21','sma50','sma200','bb'] as IndicatorKey[]).map((k) => {
            const meta = INDICATOR_META[k];
            const isActive = activeIndicators.has(k);
            return (
              <button
                key={k}
                onClick={() => toggleIndicator(k)}
                title={meta.tooltip}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                  isActive ? 'border-zinc-300 bg-white shadow-soft' : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-white'
                }`}
                style={isActive ? { color: meta.color, borderColor: meta.color + '40' } : undefined}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                {meta.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowRsi(!showRsi)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
              showRsi ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-white'
            }`}
            title="Mostrar painel de RSI (14)"
          >
            <Activity className="h-3 w-3" />
            RSI
          </button>
        </div>
      </div>

      {/* Compare overlay */}
      {compareAssets && compareAssets.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Repeat className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-semibold text-zinc-700">Comparar com:</span>
            <select
              value={overlayId ?? ''}
              onChange={(e) => setOverlayId(e.target.value || null)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-mono shadow-inner-soft focus:outline-none focus:ring-2 focus:ring-brand-500/15"
            >
              <option value="">— escolher ativo —</option>
              {compareAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.symbol} · {a.name}</option>
              ))}
            </select>
          </div>
          {correlation != null && overlayId && (
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${corrColor}`}>
              <span>Correlação:</span>
              <span className="font-mono">{correlation.toFixed(2)}</span>
              <span className="opacity-70">·</span>
              <span>{correlationLabel(correlation)}</span>
            </div>
          )}
        </div>
      )}

      {/* Main chart */}
      {filtered.length < 2 ? (
        <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 text-sm text-zinc-500">
          Histórico insuficiente para esse intervalo.
        </div>
      ) : (
        <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-soft [&_a]:!hidden" />
      )}

      {/* RSI panel */}
      {showRsi && rsiSeries.length >= 5 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>RSI (14) · acima de 70 = sobrecomprado · abaixo de 30 = sobrevendido</span>
            <span className={`tabular-nums ${rsiClass.cls}`}>atual: {lastRsi?.toFixed(1)} · {rsiClass.label}</span>
          </div>
          <div ref={rsiContainerRef} style={{ height: 110 }} className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-soft [&_a]:!hidden" />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: 'emerald' | 'rose' }) {
  const cls = color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-zinc-900';
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
