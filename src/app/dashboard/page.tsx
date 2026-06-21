import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshButton } from '@/components/refresh-button';
import { StatTile } from '@/components/stat-tile';
import { AssetCard, AssetCardEmpty, type AssetCardData } from '@/components/asset-card';
import { AssetGridWithFilter } from '@/components/asset-grid-with-filter';
import { NextCollectionTicker } from '@/components/next-collection-ticker';
import { DashboardCustomizer } from '@/components/dashboard-customizer';
import { createClient } from '@/lib/supabase/server';
import { Plus, Activity, Bell, RefreshCw, ArrowUpRight, Clock } from 'lucide-react';

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

  // USDBRL atual (pra conversões automáticas) — usaremos depois nas conversões
  const usdAsset = (assets ?? []).find((a) => a.symbol === 'USDBRL');

  const assetIds = (assets ?? []).map((a) => a.id);
  const { data: quotes } = await supabase
    .from('quotes')
    .select('asset_id, price, fetched_at')
    .in('asset_id', assetIds)
    .gte('fetched_at', new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString())
    .order('fetched_at', { ascending: false });

  // organize quotes by asset for sparkline + 24h comparison
  const seriesByAsset = new Map<string, Array<{ price: number; fetched_at: string }>>();
  for (const q of quotes ?? []) {
    const arr = seriesByAsset.get(q.asset_id) ?? [];
    arr.push({ price: Number(q.price), fetched_at: q.fetched_at });
    seriesByAsset.set(q.asset_id, arr);
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

  // Cron config pra mostrar frequência
  const { data: cronSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'cron_minutes')
    .maybeSingle();
  const cronMinutes = (cronSetting?.value as { minutes?: number } | undefined)?.minutes ?? 15;
  const cronLabel =
    cronMinutes < 60
      ? `${cronMinutes}min`
      : cronMinutes === 60
        ? '1h'
        : cronMinutes % 60 === 0
          ? `${cronMinutes / 60}h`
          : `${cronMinutes}min`;

  const lastFetch = quotes?.[0]?.fetched_at ?? null;
  const hasData = (quotes?.length ?? 0) > 0;
  const hasEnoughHistory = (quotes?.length ?? 0) > 20;

  // monta os AssetCardData
  const cardData: AssetCardData[] = (assets ?? []).map((asset) => {
    const series = seriesByAsset.get(asset.id) ?? [];
    const latest = series[0];
    const oldest = series[series.length - 1];
    const pct =
      latest && oldest && oldest.price !== 0
        ? ((latest.price - oldest.price) / oldest.price) * 100
        : null;
    const sparkPoints = series.slice(0, 60).map((p) => p.price).reverse();
    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      category: asset.category,
      unit: asset.unit,
      price: latest?.price ?? null,
      pct,
      sparkline: sparkPoints,
      fetchedAt: latest?.fetched_at ?? null
    };
  });

  // Aplica personalização: filtra + reordena baseado em dashboard_asset_ids
  const customIds = ((profile?.dashboard_asset_ids ?? []) as string[]).filter(Boolean);
  let visibleCards = cardData;
  if (customIds.length > 0) {
    const byId = new Map(cardData.map((c) => [c.id, c]));
    visibleCards = customIds
      .map((id) => byId.get(id))
      .filter((c): c is AssetCardData => !!c);
  }

  const firstName = (profile?.full_name?.split(' ')[0]) ?? 'investidor';

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      {/* Header */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <div className="animate-fade-up">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
              Mercado
            </div>
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 className="text-[34px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[38px]">
                  Bom dia, {firstName}
                </h1>
                <div className="mt-3">
                  <NextCollectionTicker intervalMinutes={cronMinutes} lastFetchedAt={lastFetch} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DashboardCustomizer
                  allAssets={(assets ?? []).map((a) => ({
                    id: a.id, symbol: a.symbol, name: a.name, category: a.category, unit: a.unit
                  }))}
                  initialSelection={customIds}
                />
                <RefreshButton showBackfill={!hasEnoughHistory} />
                <Link href="/alerts/new">
                  <Button variant="brand" size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    Criar alerta
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* 4 stat tiles */}
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 animate-fade-up-delay-1">
            <StatTile
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Ativos"
              value={String(assets?.length ?? 0)}
              sublabel="monitorados"
            />
            <StatTile
              icon={<Bell className="h-3.5 w-3.5" />}
              label="Alertas ativos"
              value={String(alertCount ?? 0)}
              sublabel="rodando agora"
            />
            <StatTile
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              label="Frequência"
              value={cronLabel}
              sublabel="coleta automática"
              tag="cron"
            />
            <StatTile
              icon={<ArrowUpRight className="h-3.5 w-3.5" />}
              label="Disparos"
              value={String(notifCount ?? 0)}
              sublabel="últimos 30 dias"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {/* CTA pra templates quando 0 alertas */}
        {(alertCount ?? 0) === 0 && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-line bg-panel p-4 shadow-card animate-fade-up">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-brand-soft p-1.5 text-brand-ink">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink">Sem alertas? Use um template pronto</p>
                <p className="mt-0.5 text-[12px] text-ink-2">
                  Escolha seu perfil (trader de café, produtor de grãos, pecuarista…) e crie tudo em 1 clique.
                </p>
              </div>
            </div>
            <Link href="/templates">
              <Button variant="outline" size="sm">Ver templates</Button>
            </Link>
          </div>
        )}

        {!hasData && (
          <div className="mb-6 rounded-xl border border-line bg-panel p-5 shadow-card animate-fade-up">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-brand-soft p-2 text-brand-ink">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-ink">Aguardando 1ª coleta</p>
                <p className="mt-0.5 text-[12px] text-ink-2">
                  Entra na próxima janela de <span className="num">{cronLabel}</span>. Ou clique em <strong>Atualizar</strong> pra forçar agora.
                </p>
                <Skeleton className="mt-3 h-1 w-full" />
              </div>
            </div>
          </div>
        )}

        {/* Acompanhamento + filtro segmentado + grid */}
        <AssetGridWithFilter cards={visibleCards} />
      </main>
    </div>
  );
}
