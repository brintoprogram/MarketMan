'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type Time, LineStyle, ColorType, CrosshairMode } from 'lightweight-charts';

export interface PricePoint {
  time: number;        // unix seconds
  price: number;
}

interface Props {
  data: PricePoint[];     // sempre passado ordenado ascendente
  unit?: string | null;
  className?: string;
  height?: number;
}

type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const TIMEFRAMES: { label: Timeframe; seconds: number | null }[] = [
  { label: '1D',  seconds: 24 * 3600 },
  { label: '1W',  seconds: 7 * 24 * 3600 },
  { label: '1M',  seconds: 30 * 24 * 3600 },
  { label: '3M',  seconds: 90 * 24 * 3600 },
  { label: '6M',  seconds: 180 * 24 * 3600 },
  { label: '1Y',  seconds: 365 * 24 * 3600 },
  { label: 'ALL', seconds: null }
];

export function PriceChart({ data, unit, className, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');

  const filtered = useMemo(() => {
    if (!data || data.length === 0) return [];
    const tf = TIMEFRAMES.find((t) => t.label === timeframe);
    if (!tf?.seconds) return data;
    const cutoff = Date.now() / 1000 - tf.seconds;
    return data.filter((p) => p.time >= cutoff);
  }, [data, timeframe]);

  const stats = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0].price;
    const last = filtered[filtered.length - 1].price;
    const min = Math.min(...filtered.map((p) => p.price));
    const max = Math.max(...filtered.map((p) => p.price));
    const pct = first ? ((last - first) / first) * 100 : 0;
    return { first, last, min, max, pct };
  }, [filtered]);

  const positive = (stats?.pct ?? 0) >= 0;
  const brandColor = positive ? '#059669' : '#e11d48';
  const fillTop    = positive ? 'rgba(16,185,129,0.20)' : 'rgba(244,63,94,0.20)';
  const fillBottom = positive ? 'rgba(16,185,129,0.00)' : 'rgba(244,63,94,0.00)';

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
      rightPriceScale: {
        borderColor: 'rgba(0,0,0,0.06)',
        scaleMargins: { top: 0.1, bottom: 0.06 }
      },
      timeScale: {
        borderColor: 'rgba(0,0,0,0.06)',
        timeVisible: timeframe === '1D' || timeframe === '1W',
        secondsVisible: false
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisDoubleClickReset: { time: true, price: true } }
    });

    chartRef.current = chart;

    const series = chart.addAreaSeries({
      lineColor: brandColor,
      lineWidth: 2,
      topColor: fillTop,
      bottomColor: fillBottom,
      priceLineVisible: true,
      priceLineColor: brandColor,
      priceLineWidth: 1,
      priceLineStyle: LineStyle.Dashed,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: brandColor,
      crosshairMarkerBackgroundColor: '#ffffff'
    });
    lineRef.current = series;

    series.setData(filtered.map((p) => ({ time: p.time as Time, value: p.price })));
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      lineRef.current = null;
    };
  }, [filtered, height, brandColor, fillTop, fillBottom, timeframe]);

  const fmtPrice = (n: number) => {
    const usd = unit?.includes('USD');
    return n.toLocaleString(usd ? 'en-US' : 'pt-BR', {
      style: 'currency',
      currency: usd ? 'USD' : 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  };

  return (
    <div className={className}>
      {/* Header: stats + timeframe selector */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-4 text-xs">
          {stats && (
            <>
              <Stat label="Variação" value={`${stats.pct >= 0 ? '+' : ''}${stats.pct.toFixed(2)}%`} color={positive ? 'emerald' : 'rose'} />
              <Stat label="Mínima" value={fmtPrice(stats.min)} />
              <Stat label="Máxima" value={fmtPrice(stats.max)} />
              <Stat label="Pontos" value={String(filtered.length)} />
            </>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-soft">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setTimeframe(tf.label)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                timeframe === tf.label
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {filtered.length < 2 ? (
        <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 text-sm text-zinc-500">
          Histórico insuficiente para esse intervalo.
        </div>
      ) : (
        <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-soft" />
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
