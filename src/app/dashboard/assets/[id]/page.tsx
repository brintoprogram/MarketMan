import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge, categoryVariant, categoryLabel } from '@/components/ui/badge';
import { Sparkline } from '@/components/ui/sparkline';
import { PriceChart, type PricePoint } from '@/components/price-chart';
import { TestAssetButton } from '@/components/test-asset-button';
import { ConvertedPrice } from '@/components/converted-price';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, formatPct, pctClass, relativeTime } from '@/lib/format';
import { getAlternateUnits } from '@/lib/conversions';
import { ArrowLeft, Plus, ExternalLink, Database, Activity, AlertCircle, AlertTriangle, Info, CheckCircle, Repeat, Calculator } from 'lucide-react';

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

  const { data: quotes } = await supabase
    .from('quotes').select('id, price, fetched_at, source, raw')
    .eq('asset_id', asset.id)
    .order('fetched_at', { ascending: false })
    .limit(1000);

  // série ascendente pro chart
  const chartData: PricePoint[] = (quotes ?? [])
    .map((q) => ({ time: Math.floor(new Date(q.fetched_at).getTime() / 1000), price: Number(q.price) }))
    .sort((a, b) => a.time - b.time);

  const series = (quotes ?? []).map((q) => ({ price: Number(q.price), fetched_at: q.fetched_at, source: q.source }));
  const latest = series[0];
  const oldest = series[series.length - 1];
  const pct = latest && oldest && oldest.price !== 0 ? ((latest.price - oldest.price) / oldest.price) * 100 : null;
  const isUsd = asset.unit?.includes('USD') ?? false;
  const sparkPoints = series.slice(0, 80).map((p) => p.price).reverse();

  const min = series.length ? Math.min(...series.map((p) => p.price)) : null;
  const max = series.length ? Math.max(...series.map((p) => p.price)) : null;

  const { data: alerts } = await supabase
    .from('alerts')
    .select('id, alert_type, threshold_pct, comparison_type, comparison_days, target_price, target_direction, active, reference_price, last_notified_at')
    .eq('asset_id', asset.id)
    .eq('user_id', user.id);

  // USDBRL atual pra conversões
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

  // brapi endpoint URL (pra exibir)
  const endpointPath = asset.brapi_kind === 'futures'
    ? `/api/v2/futures/quote?symbols=${asset.brapi_symbol}`
    : asset.brapi_kind === 'moedas'
      ? `/api/v2/currency?currency=${asset.brapi_symbol}`
      : `/api/quote/${asset.brapi_symbol}`;
  const endpointUrl = `https://brapi.dev${endpointPath}`;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 py-10">
          <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
            <ArrowLeft className="h-3.5 w-3.5" />Voltar pro dashboard
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={categoryVariant(asset.category)}>{categoryLabel(asset.category)}</Badge>
                <code className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700">{asset.symbol}</code>
                {!asset.active && <Badge variant="muted">Inativo</Badge>}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{asset.name}</h1>
              {asset.description && <p className="mt-1 max-w-2xl text-sm text-zinc-500">{asset.description}</p>}
            </div>
            <div className="flex gap-2">
              <TestAssetButton assetId={asset.id} />
              <Link href={`/alerts/new?asset=${asset.id}`}>
                <Button variant="brand">
                  <Plus className="h-4 w-4" />
                  Criar alerta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-3">
        {/* Bloco principal: gráfico + stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preço atual */}
          <Card className="shadow-lifted">
            <CardContent className="pt-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Preço atual</div>
                <div className="mt-1 flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-5xl font-bold tabular-nums tracking-tight text-zinc-900">
                      {latest ? formatPrice(latest.price, isUsd ? 'USD' : 'BRL') : '—'}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className={`font-semibold tabular-nums ${pctClass(pct)}`}>{formatPct(pct)}</span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-zinc-500">{series.length} pontos coletados</span>
                    </div>
                  </div>
                  {asset.unit && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-1.5 text-xs font-mono text-zinc-600">
                      {asset.unit}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico real (lightweight-charts) */}
          <Card className="shadow-lifted">
            <CardContent className="pt-6">
              <PriceChart data={chartData} unit={asset.unit} height={380} />
            </CardContent>
          </Card>

          {/* Em outras unidades */}
          {alternates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Repeat className="h-5 w-5 text-brand-600" />Em outras unidades</CardTitle>
                <CardDescription>
                  Conversões automáticas {usdBrl ? `· USD/BRL = R$ ${usdBrl.toFixed(4)}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConvertedPrice alternates={alternates} variant="block" />
                <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 text-xs text-zinc-600">
                  <p>
                    Cálculos derivados de: 1 saca = 60 kg ≈ 132,28 lb · 1 arroba = 15 kg ≈ 33,07 lb · 1 oz troy = 31,10 g.
                    Conversões com BRL/USD usam a cotação spot do USDBRL mais recente coletada.
                  </p>
                  <Link href={`/calculator?asset=${asset.id}`} className="mt-2 inline-flex items-center gap-1 text-brand-700 hover:underline">
                    <Calculator className="h-3 w-3" />
                    Abrir no conversor de venda →
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fonte dos dados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-brand-600" />De onde vem esse dado</CardTitle>
              <CardDescription>Endpoint, ticker e diagnóstico da última coleta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <KVRow label="Provedor" value="brapi.dev" />
              <KVRow label="Endpoint kind" value={asset.brapi_kind} mono />
              <KVRow label="Símbolo na brapi" value={asset.brapi_symbol} mono />
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">URL completa da request</div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2">
                  <code className="truncate font-mono text-xs text-zinc-700">{endpointUrl}</code>
                  <a href={endpointUrl} target="_blank" rel="noreferrer" className="flex-shrink-0 text-brand-700 hover:text-brand-800" title="Abrir no navegador">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle className="h-3.5 w-3.5" />Última coleta bem-sucedida
                  </div>
                  {lastSuccessfulFetch ? (
                    <>
                      <div className="mt-1 text-sm font-semibold text-zinc-900">{relativeTime(lastSuccessfulFetch.created_at)}</div>
                      {lastSuccessfulFetch.duration_ms && <div className="text-xs text-zinc-500">em {lastSuccessfulFetch.duration_ms}ms</div>}
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-zinc-500">Nenhuma ainda</div>
                  )}
                </div>
                <div className="rounded-lg border border-rose-200/60 bg-rose-50/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                    <AlertCircle className="h-3.5 w-3.5" />Última falha
                  </div>
                  {lastFailedFetch ? (
                    <>
                      <div className="mt-1 text-sm font-semibold text-zinc-900">{relativeTime(lastFailedFetch.created_at)}</div>
                      <div className="truncate text-xs text-rose-700" title={lastFailedFetch.error_message ?? ''}>{lastFailedFetch.error_message}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-zinc-500">Sem falhas</div>
                  )}
                </div>
              </div>

              {latest && quotes && quotes[0]?.raw && (
                <details className="rounded-lg border border-zinc-200 bg-zinc-50/30">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-zinc-700">
                    Ver retorno bruto da última coleta (raw)
                  </summary>
                  <pre className="overflow-x-auto border-t border-zinc-200 bg-zinc-50/60 p-3 font-mono text-[10px] text-zinc-700">
{JSON.stringify(quotes[0].raw, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>

          {/* Histórico de coletas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-brand-600" />Histórico recente</CardTitle>
              <CardDescription>Últimos 30 pontos de cotação coletados.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-zinc-100">
                {(quotes ?? []).slice(0, 30).map((q) => (
                  <li key={q.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-sm tabular-nums text-zinc-900">
                        {formatPrice(q.price, isUsd ? 'USD' : 'BRL')}
                      </code>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">{q.source}</span>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <div>{new Date(q.fetched_at).toLocaleString('pt-BR')}</div>
                      <div className="text-zinc-400">{relativeTime(q.fetched_at)}</div>
                    </div>
                  </li>
                ))}
                {(!quotes || quotes.length === 0) && (
                  <li className="py-8 text-center text-sm text-zinc-500">Nenhuma cotação ainda.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Seus alertas pra esse ativo */}
          <Card>
            <CardHeader>
              <CardTitle>Seus alertas</CardTitle>
              <CardDescription>{alerts?.length ?? 0} configurado{alerts?.length === 1 ? '' : 's'} pra esse ativo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(alerts ?? []).map((a: any) => (
                <Link key={a.id} href={`/alerts/${a.id}`} className="block rounded-lg border border-zinc-200 bg-white p-3 text-sm transition hover:border-brand-300 hover:shadow-soft">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${a.active ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                    {a.alert_type === 'price_target' ? (
                      <>
                        <span className="text-xs text-zinc-500">{a.target_direction === 'above' ? '≥' : a.target_direction === 'below' ? '≤' : '↔'}</span>
                        <span className="font-mono font-semibold text-zinc-900">
                          {Number(a.target_price).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-zinc-900">≥ {a.threshold_pct}%</span>
                        <span className="text-zinc-500">
                          {a.comparison_type === 'last_message' ? 'desde última msg' : `${a.comparison_days}d atrás`}
                        </span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
              {(!alerts || alerts.length === 0) && (
                <p className="py-4 text-center text-xs text-zinc-500">Nenhum alerta ainda.</p>
              )}
              <Link href={`/alerts/new?asset=${asset.id}`} className="block">
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4" />Criar alerta
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Logs do ativo */}
          <Card>
            <CardHeader>
              <CardTitle>Eventos recentes</CardTitle>
              <CardDescription>Últimos 30 eventos do sistema relacionados a esse ativo.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-zinc-100 text-xs">
                {(logs ?? []).map((l: any) => (
                  <li key={l.id} className="flex items-start gap-2 py-2">
                    <LogDot level={l.level} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-900">{l.event}</span>
                        <span className="text-zinc-400">{relativeTime(l.created_at)}</span>
                      </div>
                      {l.error_message && <p className="mt-0.5 truncate text-rose-600" title={l.error_message}>{l.error_message}</p>}
                      {l.response_status && <p className="font-mono text-[10px] text-zinc-500">HTTP {l.response_status} · {l.duration_ms}ms</p>}
                    </div>
                  </li>
                ))}
                {(!logs || logs.length === 0) && (
                  <li className="py-4 text-center text-zinc-500">Sem eventos ainda.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Mini({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-0.5 font-semibold text-zinc-900 ${mono ? 'font-mono text-sm' : ''}`}>{value}</div>
    </div>
  );
}

function KVRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`text-sm text-zinc-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function LogDot({ level }: { level: string }) {
  const cls = level === 'error' ? 'bg-rose-500' : level === 'warn' ? 'bg-amber-500' : level === 'info' ? 'bg-brand-500' : 'bg-zinc-300';
  return <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls}`} />;
}
