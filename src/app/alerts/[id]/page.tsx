import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { AlertForm } from '@/components/alert-form';
import { formatPrice, formatPct, relativeTime } from '@/lib/format';
import { ArrowLeft, History } from 'lucide-react';
import { CATEGORY_DOT } from '@/components/asset-card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function deleteAlert(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from('alerts').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/alerts');
  redirect('/alerts');
}

async function toggleAlert(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const nextActive = formData.get('next_active') === 'true';
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from('alerts').update({ active: nextActive }).eq('id', id).eq('user_id', user.id);
  revalidatePath(`/alerts/${id}`);
}

export default async function AlertDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: alert } = await supabase
    .from('alerts')
    .select('*, asset:assets(id, symbol, name, category, unit)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<{
      id: string;
      asset_id: string;
      alert_type: 'percentage' | 'price_target';
      threshold_pct: number;
      comparison_type: 'last_message' | 'days';
      comparison_days: number | null;
      target_price: number | null;
      target_direction: 'above' | 'below' | 'crosses' | null;
      message_template: string | null;
      max_per_day: number | null;
      recipient_ids: string[] | null;
      active: boolean;
      asset: { id: string; symbol: string; name: string; category: string; unit: string | null } | null;
    }>();

  if (!alert) notFound();

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit')
    .eq('active', true)
    .order('display_order');

  const { data: recipients } = await supabase
    .from('recipients').select('id, name, phone, is_self')
    .eq('user_id', user.id).eq('verified', true)
    .order('is_self', { ascending: false });

  // Latest price + prevPrice por ativo (7d atrás) pra alimentar a prévia
  const assetIds = (assets ?? []).map((a) => a.id);
  const latestByAsset: Record<string, { price: number; prevPrice?: number | null }> = {};
  if (assetIds.length) {
    const { data: recentQuotes } = await supabase
      .from('quotes')
      .select('asset_id, price, fetched_at')
      .in('asset_id', assetIds)
      .gte('fetched_at', new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString())
      .order('fetched_at', { ascending: false });

    const sevenDaysAgoMs = Date.now() - 7 * 24 * 3600 * 1000;
    for (const q of recentQuotes ?? []) {
      const aid = q.asset_id;
      if (!latestByAsset[aid]) {
        latestByAsset[aid] = { price: Number(q.price) };
      } else if (latestByAsset[aid].prevPrice == null) {
        const t = new Date(q.fetched_at).getTime();
        if (t <= sevenDaysAgoMs) latestByAsset[aid].prevPrice = Number(q.price);
      }
    }
  }

  const { data: history } = await supabase
    .from('alert_history')
    .select('id, price_now, price_reference, pct_change, message, sent_at, status, delivered_at, read_at, recipient_name')
    .eq('alert_id', alert.id)
    .order('sent_at', { ascending: false })
    .limit(20);

  const assetObj = alert.asset;
  const isUsd = assetObj?.unit?.includes('USD') ?? false;
  const categoryDot = assetObj ? (CATEGORY_DOT[assetObj.category] ?? 'var(--ink-3)') : 'var(--ink-3)';
  const categoryLabelText =
    assetObj?.category === 'commodity' ? 'Commodity'
    : assetObj?.category === 'currency' ? 'Moeda'
    : assetObj?.category === 'stock' ? 'Ação'
    : assetObj?.category === 'crypto' ? 'Cripto'
    : assetObj?.category === 'index' ? 'Índice'
    : assetObj?.category ?? '';

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <Link
            href="/alerts"
            className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar pra alertas
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-up">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="inline-block h-[7px] w-[7px] rounded-full"
                  style={{ background: categoryDot }}
                  aria-hidden
                />
                <code className="num text-[11px] font-medium uppercase tracking-wider text-ink-2">
                  {assetObj?.symbol}
                </code>
                <span className="text-[11px] text-ink-3">·</span>
                <span className="text-[11px] font-medium text-ink-3">{categoryLabelText}</span>
                {alert.active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-ink">
                    <span className="dot-active" />Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-2 px-2 py-0.5 text-[10px] font-semibold text-ink-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />Pausado
                  </span>
                )}
              </div>
              <h1 className="text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[36px]">
                {assetObj?.name}
              </h1>
              <p className="mt-2 text-[12px] text-ink-3">
                Edite os parâmetros, ajuste a mensagem e veja a prévia ao vivo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={toggleAlert}>
                <input type="hidden" name="id" value={alert.id} />
                <input type="hidden" name="next_active" value={String(!alert.active)} />
                <Button type="submit" variant="outline" size="sm">{alert.active ? 'Pausar' : 'Ativar'}</Button>
              </form>
              <form action={deleteAlert}>
                <input type="hidden" name="id" value={alert.id} />
                <Button type="submit" variant="destructive" size="sm">Excluir</Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-8 animate-fade-up-delay-1">
        <AlertForm
          assets={assets ?? []}
          recipients={(recipients ?? []) as any}
          latestByAsset={latestByAsset}
          initial={{
            id: alert.id,
            asset_id: alert.asset_id,
            alert_type: alert.alert_type ?? 'percentage',
            threshold_pct: alert.threshold_pct,
            comparison_type: alert.comparison_type,
            comparison_days: alert.comparison_days,
            target_price: alert.target_price,
            target_direction: alert.target_direction,
            message_template: alert.message_template,
            max_per_day: alert.max_per_day,
            recipient_ids: alert.recipient_ids ?? [],
            active: alert.active
          }}
        />

        {/* Histórico em nova linguagem */}
        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-brand-ink" />
              <h2 className="text-[15px] font-semibold tracking-tight text-ink">Histórico recente</h2>
            </div>
            <span className="num text-[11px] text-ink-3">{history?.length ?? 0} disparos</span>
          </div>
          {(!history || history.length === 0) ? (
            <Card>
              <CardContent className="py-10 text-center text-[12px] text-ink-3">
                Esse alerta ainda não disparou.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {history.map((h: any) => {
                const pctUp = (h.pct_change ?? 0) >= 0;
                const statusColor =
                  h.read_at ? 'text-[#53BDEB]'
                  : h.delivered_at ? 'text-up'
                  : h.status === 'sent' ? 'text-up'
                  : h.status === 'failed' ? 'text-down'
                  : 'text-[#B45309]';
                const statusLabel =
                  h.read_at ? 'lida'
                  : h.delivered_at ? 'entregue'
                  : h.status === 'sent' ? 'enviada'
                  : h.status === 'failed' ? 'falhou'
                  : 'na fila';
                return (
                  <div key={h.id} className="card-hover rounded-md border border-line bg-panel px-3 py-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className={`num text-[13px] font-semibold ${pctUp ? 'text-up' : 'text-down'}`}>
                          {formatPct(h.pct_change)}
                        </span>
                        <span className="text-ink-3">·</span>
                        <span className="num text-[11px] text-ink-2">
                          {formatPrice(h.price_reference, isUsd ? 'USD' : 'BRL')} → {formatPrice(h.price_now, isUsd ? 'USD' : 'BRL')}
                        </span>
                        {h.recipient_name && (
                          <span className="text-[11px] text-ink-3">· pra {h.recipient_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
                        <span className="num text-ink-3">{relativeTime(h.sent_at)}</span>
                      </div>
                    </div>
                    <details className="mt-1.5">
                      <summary className="cursor-pointer select-none text-[10px] text-ink-3 hover:text-ink">
                        Ver mensagem enviada
                      </summary>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded border border-line bg-panel-2 p-2 font-mono text-[10px] leading-relaxed text-ink-2">{h.message}</pre>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
