import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Badge, categoryVariant, categoryLabel } from '@/components/ui/badge';
import { Sparkline } from '@/components/ui/sparkline';
import { RefreshButton } from '@/components/refresh-button';
import { ConvertedPrice } from '@/components/converted-price';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, formatPct, pctClass, relativeTime } from '@/lib/format';
import { formatVolumeBRL } from '@/lib/format-extras';
import { getAlternateUnits } from '@/lib/conversions';
import { ArrowRight, Plus, Bell, Activity, RefreshCw, AlertCircle, BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.whatsapp_verified) redirect('/onboarding');

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit, brapi_kind')
    .eq('active', true)
    .order('display_order');

  // USDBRL atual (pra conversões automáticas) — pega cotação mais recente
  const usdAsset = (assets ?? []).find((a) => a.symbol === 'USDBRL');
  let usdBrl: number | null = null;
  if (usdAsset) {
    const { data: usdQuote } = await supabase
      .from('quotes')
      .select('price')
      .eq('asset_id', usdAsset.id)
      .order('fetched_at', { ascending: false })
      .limit(1).maybeSingle();
    if (usdQuote) usdBrl = Number(usdQuote.price);
  }

  const assetIds = (assets ?? []).map((a) => a.id);
  const { data: quotes } = await supabase
    .from('quotes')
    .select('asset_id, price, fetched_at, volume_brl')
    .in('asset_id', assetIds)
    .gte('fetched_at', new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString())
    .order('fetched_at', { ascending: false });

  // organize quotes by asset for sparkline + 24h comparison
  const seriesByAsset = new Map<string, Array<{ price: number; fetched_at: string }>>();
  const lastVolumeByAsset = new Map<string, number>();
  for (const q of quotes ?? []) {
    const arr = seriesByAsset.get(q.asset_id) ?? [];
    arr.push({ price: Number(q.price), fetched_at: q.fetched_at });
    seriesByAsset.set(q.asset_id, arr);
    if (q.volume_brl != null && !lastVolumeByAsset.has(q.asset_id)) {
      lastVolumeByAsset.set(q.asset_id, Number(q.volume_brl));
    }
  }

  const { count: alertCount } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('active', true);

  const { count: notifCount } = await supabase
    .from('alert_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('sent_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());

  const lastFetch = quotes?.[0]?.fetched_at;
  const hasData = (quotes?.length ?? 0) > 0;
  const hasEnoughHistory = (quotes?.length ?? 0) > 20;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />

      {/* Hero header */}
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="animate-fade-up">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Mercado</div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Bom dia, {(profile?.full_name?.split(' ')[0]) ?? 'investidor'}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {lastFetch ? `Última atualização ${relativeTime(lastFetch)}` : 'Aguardando primeira coleta'}
              </p>
            </div>
            <div className="flex items-center gap-3 animate-fade-up-delay-1">
              <RefreshButton showBackfill={!hasEnoughHistory} />
              <Link href="/alerts/new">
                <Button variant="brand" size="lg">
                  <Plus className="h-4 w-4" />
                  Criar alerta
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 animate-fade-up-delay-2">
            <StatTile
              icon={<Activity className="h-4 w-4" />}
              label="Ativos"
              value={String(assets?.length ?? 0)}
              hint="monitorados"
            />
            <StatTile
              icon={<Bell className="h-4 w-4" />}
              label="Alertas ativos"
              value={String(alertCount ?? 0)}
              hint="rodando agora"
            />
            <StatTile
              icon={<RefreshCw className="h-4 w-4" />}
              label="Frequência"
              value="15min"
              hint="coleta automática"
            />
            <StatTile
              icon={<ArrowRight className="h-4 w-4" />}
              label="Notificações (30d)"
              value={String(notifCount ?? 0)}
              hint="WhatsApp"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {!hasData && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 shadow-soft animate-fade-up">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Sem cotações ainda</p>
              <p className="mt-1 text-sm text-amber-800">
                Clique em <strong>"Carregar histórico real"</strong> pra puxar 30 dias de cotações da brapi.
                Depois, <strong>"Atualizar agora"</strong> traz o preço corrente. O cron a cada 15min mantém atualizado depois.
              </p>
            </div>
          </div>
        )}
        {hasData && !hasEnoughHistory && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/60 p-5 shadow-soft animate-fade-up">
            <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sky-900">Pouco histórico ainda</p>
              <p className="mt-1 text-sm text-sky-800">
                Os sparklines ficam mais ricos com mais pontos. Clique em <strong>"Carregar histórico real"</strong> pra puxar 30 dias da brapi de uma vez.
              </p>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Acompanhamento</h2>
          <p className="text-xs text-zinc-500">Toque num card pra ver detalhamento</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(assets ?? []).map((asset, idx) => {
            const series = seriesByAsset.get(asset.id) ?? [];
            const latest = series[0];
            const oldest = series[series.length - 1];
            const pct = latest && oldest && oldest.price !== 0
              ? ((latest.price - oldest.price) / oldest.price) * 100
              : null;
            const isUsd = asset.unit?.includes('USD') ?? false;
            const sparkPoints = series.slice(0, 60).map((p) => p.price).reverse();
            const animDelay = idx % 6;

            return (
              <Link
                key={asset.id}
                href={`/dashboard/assets/${asset.id}`}
                className="group card-hover relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft hover:border-brand-300/80 hover:shadow-lifted animate-fade-up"
                style={{ animationDelay: `${animDelay * 40}ms` }}
              >
                {/* Top: badge + symbol */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <Badge variant={categoryVariant(asset.category)}>
                      {categoryLabel(asset.category)}
                    </Badge>
                    <div>
                      <div className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                        {asset.symbol}
                      </div>
                      <div className="text-base font-semibold leading-tight text-zinc-900">{asset.name}</div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-2 text-zinc-300 transition group-hover:bg-brand-50 group-hover:text-brand-600">
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </div>

                {/* Price + pct */}
                <div className="flex items-end justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-3xl font-bold tabular-nums tracking-tight text-zinc-900">
                      {latest ? formatPrice(latest.price, isUsd ? 'USD' : 'BRL') : '—'}
                    </div>
                    {latest && (
                      <ConvertedPrice
                        alternates={getAlternateUnits(asset, latest.price, usdBrl).slice(0, 1)}
                      />
                    )}
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      <span className={`font-semibold tabular-nums ${pctClass(pct)}`}>{formatPct(pct)}</span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-zinc-500">7 dias</span>
                    </div>
                  </div>
                  <Sparkline points={sparkPoints} positive={(pct ?? 0) >= 0} height={40} width={100} />
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-2">
                    {latest ? relativeTime(latest.fetched_at) : 'sem dados'}
                    {lastVolumeByAsset.get(asset.id) != null && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200/60" title="Volume do último pregão">
                        <BarChart3 className="h-2.5 w-2.5" />
                        {formatVolumeBRL(lastVolumeByAsset.get(asset.id))}
                      </span>
                    )}
                  </span>
                  {asset.unit && <span className="font-mono">{asset.unit}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function StatTile({ icon, label, value, hint }: {
  icon: React.ReactNode; label: string; value: string; hint: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-soft backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        <span className="text-brand-600">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-zinc-900">{value}</div>
      <div className="text-xs text-zinc-400">{hint}</div>
    </div>
  );
}
