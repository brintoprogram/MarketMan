import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PriceChart, type PricePoint, type CompareAsset } from '@/components/price-chart';
import { LiquidityBlock } from '@/components/liquidity-block';
import { CalendarSpreadBlock } from '@/components/calendar-spread-block';
import { TestAssetButton } from '@/components/test-asset-button';
import { ConvertedPrice } from '@/components/converted-price';
import { DataSourceTimeline } from '@/components/data-source-timeline';
import { QuotesTable } from '@/components/quotes-table';
import { EventsTimeline } from '@/components/events-timeline';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, formatPct, relativeTime } from '@/lib/format';
import { getAlternateUnits } from '@/lib/conversions';
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, History, Database,
  Bell, Activity, Repeat, Calculator
} from 'lucide-react';
import { CATEGORY_DOT } from '@/components/asset-card';

export const dynamic = 'force-dynamic';

export default async function AssetDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: asset } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit, description, brapi_kind, brapi_symbol, active')
    .eq('id', params.id)
    .single();
  if (!asset) notFound();

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, price, fetched_at, source, raw, volume_brl, trades_count, open_interest, oscillation_pct, ohlc')
    .eq('asset_id', asset.id)
    .gte('fetched_at', fiveYearsAgo.toISOString())
    .order('fetched_at', { ascending: false });

  const { data: spread } = await supabase
    .from('v_latest_calendar_spread')
    .select('front_symbol, front_price, next_symbol, next_price, spread_value, spread_pct, computed_at')
    .eq('asset_id', asset.id)
    .maybeSingle();

  const lastLiquidityQuote = (quotes ?? []).find((q: any) => q.volume_brl != null);

  const chartData: PricePoint[] = (quotes ?? [])
    .map((q) => ({ time: Math.floor(new Date(q.fetched_at).getTime() / 1000), price: Number(q.price) }))
    .sort((a, b) => a.time - b.time);

  const { data: otherAssets } = await supabase
    .from('assets')
    .select('id, symbol, name, unit')
    .eq('active', true)
    .neq('id', asset.id)
    .order('display_order');

  const otherIds = (otherAssets ?? []).map((a) => a.id);
  let compareAssets: CompareAsset[] = [];
  if (otherIds.length) {
    const { data: otherQuotes } = await supabase
      .from('quotes')
      .select('asset_id, price, fetched_at')
      .in('asset_id', otherIds)
      .order('fetched_at', { ascending: true });
    const byAsset = new Map<string, PricePoint[]>();
    for (const q of otherQuotes ?? []) {
      const t = Math.floor(new Date(q.fetched_at).getTime() / 1000);
      const arr = byAsset.get(q.asset_id) ?? [];
      arr.push({ time: t, price: Number(q.price) });
      byAsset.set(q.asset_id, arr);
    }
    compareAssets = (otherAssets ?? [])
      .filter((a) => (byAsset.get(a.id)?.length ?? 0) > 5)
      .map((a) => ({ id: a.id, symbol: a.symbol, name: a.name, unit: a.unit, data: byAsset.get(a.id) ?? [] }));
  }

  const series = (quotes ?? []).map((q) => ({ price: Number(q.price), fetched_at: q.fetched_at, source: q.source }));
  const latest = series[0];
  const oldest = series[series.length - 1];
  const pct = latest && oldest && oldest.price !== 0 ? ((latest.price - oldest.price) / oldest.price) * 100 : null;
  const isUsd = asset.unit?.includes('USD') ?? false;
  const min = series.length ? Math.min(...series.map((p) => p.price)) : null;
  const max = series.length ? Math.max(...series.map((p) => p.price)) : null;

  const { data: alerts } = await supabase
    .from('alerts')
    .select('id, alert_type, threshold_pct, comparison_type, comparison_days, target_price, target_direction, active, reference_price, last_notified_at')
    .eq('asset_id', asset.id)
    .eq('user_id', user.id);

  const { data: usdAsset } = await supabase.from('assets').select('id').eq('symbol', 'USDBRL').single();
  let usdBrl: number | null = null;
  if (usdAsset) {
    const { data: usdQuote } = await supabase
      .from('quotes').select('price')
      .eq('asset_id', usdAsset.id)
      .order('fetched_at', { ascending: false }).limit(1).maybeSingle();
    if (usdQuote) usdBrl = Number(usdQuote.price);
  }
  const alternates = latest ? getAlternateUnits(asset, latest.price, usdBrl) : [];

  const { data: logs } = await supabase
    .from('system_logs')
    .select('id, level, source, event, request_url, response_status, response_body, error_message, duration_ms, metadata, created_at')
    .eq('asset_id', asset.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const lastSuccessfulFetch = logs?.find((l) => l.event === 'quote_inserted');
  const lastFailedFetch = logs?.find((l) => l.level === 'error' && (l.event === 'brapi_call_failed' || l.event === 'brapi_call_exception'));
  const lastNotified = (alerts ?? [])
    .map((a) => a.last_notified_at)
    .filter(Boolean)
    .sort()
    .reverse()[0] as string | undefined;

  const actualSymbol = ((lastSuccessfulFetch?.metadata as any) ?? {}).actual_symbol as string | undefined;

  const endpointPath = asset.brapi_kind === 'futures'
    ? `/api/v2/futures/quote?symbols=${asset.brapi_symbol}`
    : asset.brapi_kind === 'moedas'
      ? `/api/v2/currency?currency=${asset.brapi_symbol}`
      : `/api/quote/${asset.brapi_symbol}`;
  const endpointUrl = `https://brapi.dev${endpointPath}`;

  const categoryDot = CATEGORY_DOT[asset.category as keyof typeof CATEGORY_DOT] ?? 'var(--ink-3)';
  const categoryLabelText =
    asset.category === 'commodity' ? 'Commodity'
    : asset.category === 'currency' ? 'Moeda'
    : asset.category === 'stock' ? 'Ação'
    : asset.category === 'crypto' ? 'Cripto'
    : asset.category === 'index' ? 'Índice'
    : asset.category;

  const direction: 'up' | 'down' | 'flat' = pct == null ? 'flat' : pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  const trendIcon = direction === 'up'
    ? <TrendingUp className="h-3.5 w-3.5" />
    : direction === 'down'
      ? <TrendingDown className="h-3.5 w-3.5" />
      : null;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      {/* Header denso */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar pro dashboard
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-5 animate-fade-up">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="inline-block h-[7px] w-[7px] rounded-full"
                  style={{ background: categoryDot }}
                  aria-hidden
                />
                <code className="num text-[11px] font-medium uppercase tracking-wider text-ink-2">
                  {asset.symbol}
                </code>
                <span className="text-[11px] text-ink-3">·</span>
                <span className="text-[11px] font-medium text-ink-3">{categoryLabelText}</span>
                {!asset.active && (
                  <span className="rounded bg-down-soft px-1.5 py-0.5 text-[10px] font-medium text-down">inativo</span>
                )}
              </div>
              <h1 className="text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[36px]">
                {asset.name}
              </h1>
              {asset.description && (
                <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-2">
                  {asset.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <TestAssetButton assetId={asset.id} />
              <Link href={`/alerts/new?asset=${asset.id}`}>
                <Button variant="brand" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Criar alerta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-8 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-5 lg:col-span-2">
          {/* Preço grande + variação + min/max */}
          <Card>
            <CardContent className="pt-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
                Preço atual
              </div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="num text-[48px] font-semibold leading-none tracking-[-0.02em] text-ink">
                    {latest ? formatPrice(latest.price, isUsd ? 'USD' : 'BRL') : '—'}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {pct != null && (
                      <span
                        className={`num inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${
                          direction === 'up' ? 'bg-up-soft text-up'
                          : direction === 'down' ? 'bg-down-soft text-down'
                          : 'bg-panel-2 text-ink-2'
                        }`}
                      >
                        {trendIcon}
                        {formatPct(pct)}
                      </span>
                    )}
                    <span className="num text-[11px] text-ink-3">
                      {series.length} pontos coletados
                    </span>
                  </div>
                </div>
                {asset.unit && (
                  <span className="num rounded-md border border-line bg-panel-2 px-2.5 py-1.5 text-[11px] font-medium text-ink-2">
                    {asset.unit}
                  </span>
                )}
              </div>

              {(min != null && max != null && latest) && (
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
                  <Mini label="Mínima" value={formatPrice(min, isUsd ? 'USD' : 'BRL')} />
                  <Mini label="Máxima" value={formatPrice(max, isUsd ? 'USD' : 'BRL')} />
                  <Mini
                    label="Última coleta"
                    value={relativeTime(latest.fetched_at)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico */}
          <Card>
            <CardContent className="pt-5">
              <PriceChart data={chartData} unit={asset.unit} height={380} compareAssets={compareAssets} />
            </CardContent>
          </Card>

          {/* Liquidez (futures) */}
          {asset.brapi_kind === 'futures' && lastLiquidityQuote && (
            <LiquidityBlock
              volumeBRL={lastLiquidityQuote.volume_brl}
              trades={lastLiquidityQuote.trades_count}
              openInterest={lastLiquidityQuote.open_interest}
              oscillationPct={lastLiquidityQuote.oscillation_pct}
              ohlc={lastLiquidityQuote.ohlc}
              unit={asset.unit}
              fetchedAt={lastLiquidityQuote.fetched_at}
            />
          )}

          {/* Calendar spread (futures) */}
          {asset.brapi_kind === 'futures' && spread && (
            <CalendarSpreadBlock spread={spread} unit={asset.unit} />
          )}

          {/* Em outras unidades */}
          {alternates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-brand-ink" />
                  Em outras unidades
                </CardTitle>
                <CardDescription>
                  Conversões automáticas {usdBrl ? `· USD/BRL = R$ ${usdBrl.toFixed(4)}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConvertedPrice alternates={alternates} variant="block" />
                <div className="mt-4 rounded-md border border-line bg-panel-2 px-3 py-2.5">
                  <p className="text-[11px] leading-relaxed text-ink-2">
                    Cálculos derivados de: 1 saca = 60 kg ≈ 132,28 lb · 1 arroba = 15 kg ≈ 33,07 lb · 1 oz troy = 31,10 g.
                    Câmbio com USD/BRL spot mais recente.
                  </p>
                  <Link href={`/calculator?asset=${asset.id}`} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-ink hover:underline">
                    <Calculator className="h-3 w-3" />
                    Abrir no conversor de venda →
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* De onde vem esse dado — TIMELINE */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-brand-ink" />
                De onde vem esse dado
              </CardTitle>
              <CardDescription>
                Caminho da coleta — provedor → coleta → banco → seu alerta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataSourceTimeline
                provider="brapi.dev"
                endpointUrl={endpointUrl}
                brapiKind={asset.brapi_kind}
                brapiSymbol={asset.brapi_symbol}
                actualSymbol={actualSymbol ?? null}
                lastFetchAt={lastSuccessfulFetch?.created_at ?? null}
                lastFetchDuration={lastSuccessfulFetch?.duration_ms ?? null}
                lastFetchOk={!!lastSuccessfulFetch && !lastFailedFetch || (lastSuccessfulFetch?.created_at ?? '') > (lastFailedFetch?.created_at ?? '')}
                lastFetchError={lastFailedFetch?.error_message ?? null}
                insertedAt={latest?.fetched_at ?? null}
                insertedPrice={latest?.price ?? null}
                userAlertCount={alerts?.length ?? 0}
                lastNotifiedAt={lastNotified ?? null}
              />

              {/* Raw JSON colapsado, sutil */}
              {latest && quotes && quotes[0]?.raw && (
                <details className="mt-5 rounded-md border border-line bg-panel-2">
                  <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-ink-2 hover:text-ink">
                    Ver retorno bruto da última coleta (raw JSON)
                  </summary>
                  <pre className="overflow-x-auto border-t border-line bg-bg p-3 font-mono text-[10px] leading-relaxed text-ink-2">
{JSON.stringify(quotes[0].raw, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>

          {/* Histórico de coletas — TABELA DENSA */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-brand-ink" />
                Histórico de coletas
              </CardTitle>
              <CardDescription>Últimos 30 pontos de cotação gravados.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <QuotesTable
                rows={(quotes ?? []).map((q) => ({
                  id: q.id, price: Number(q.price), fetched_at: q.fetched_at, source: q.source
                }))}
                isUsd={isUsd}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-ink" />
                Seus alertas
              </CardTitle>
              <CardDescription>
                {alerts?.length ?? 0} configurado{alerts?.length === 1 ? '' : 's'} pra esse ativo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(alerts ?? []).map((a: any) => (
                <Link
                  key={a.id}
                  href={`/alerts/${a.id}`}
                  className="card-hover block rounded-md border border-line bg-panel p-3 transition"
                >
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${a.active ? 'bg-brand' : 'bg-line-strong'}`} />
                      {a.alert_type === 'price_target' ? (
                        <>
                          <span className="text-ink-3">
                            {a.target_direction === 'above' ? '≥' : a.target_direction === 'below' ? '≤' : '↔'}
                          </span>
                          <span className="num font-semibold text-ink">
                            {Number(a.target_price).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="num font-semibold text-ink">≥ {a.threshold_pct}%</span>
                          <span className="text-ink-3">
                            {a.comparison_type === 'last_message' ? 'desde última msg' : `${a.comparison_days}d atrás`}
                          </span>
                        </>
                      )}
                    </div>
                    {a.last_notified_at && (
                      <span className="num flex-shrink-0 text-[10px] text-ink-3">
                        {relativeTime(a.last_notified_at)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {(!alerts || alerts.length === 0) && (
                <p className="px-1 py-3 text-center text-[12px] text-ink-3">Nenhum alerta ainda.</p>
              )}
              <Link href={`/alerts/new?asset=${asset.id}`} className="block">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-3.5 w-3.5" />
                  Criar alerta
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand-ink" />
                Eventos do sistema
              </CardTitle>
              <CardDescription>Últimos 30 eventos relacionados.</CardDescription>
            </CardHeader>
            <CardContent>
              <EventsTimeline events={(logs ?? []) as any} />
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">{label}</div>
      <div className="num mt-0.5 text-[14px] font-medium text-ink">{value}</div>
    </div>
  );
}
