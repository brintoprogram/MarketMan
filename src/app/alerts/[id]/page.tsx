import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, categoryVariant, categoryLabel } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { AlertForm } from '@/components/alert-form';
import { formatPrice, formatPct, pctClass, relativeTime } from '@/lib/format';
import { ArrowLeft, History } from 'lucide-react';
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
      active: boolean;
      asset: { id: string; symbol: string; name: string; category: string; unit: string | null } | null;
    }>();

  if (!alert) notFound();

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit')
    .eq('active', true)
    .order('display_order');

  const { data: history } = await supabase
    .from('alert_history')
    .select('id, price_now, price_reference, pct_change, message, sent_at, status')
    .eq('alert_id', alert.id)
    .order('sent_at', { ascending: false })
    .limit(20);

  const assetObj = alert.asset as { name?: string; symbol?: string; category?: string; unit?: string | null } | null;
  const isUsd = assetObj?.unit?.includes('USD') ?? false;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />

      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-10">
          <Link href="/alerts" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar pra alertas
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={categoryVariant(assetObj?.category ?? 'muted')}>
                  {categoryLabel(assetObj?.category ?? '')}
                </Badge>
                <span className="font-mono text-xs text-zinc-400">{assetObj?.symbol}</span>
                {alert.active
                  ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/60"><span className="dot-active" />Ativo</span>
                  : <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200/60"><span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />Pausado</span>}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{assetObj?.name}</h1>
            </div>
            <div className="flex gap-2">
              <form action={toggleAlert}>
                <input type="hidden" name="id" value={alert.id} />
                <input type="hidden" name="next_active" value={String(!alert.active)} />
                <Button type="submit" variant="outline">{alert.active ? 'Pausar' : 'Ativar'}</Button>
              </form>
              <form action={deleteAlert}>
                <input type="hidden" name="id" value={alert.id} />
                <Button type="submit" variant="destructive">Excluir</Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-6 py-10 animate-fade-up-delay-1">
        <AlertForm
          assets={assets ?? []}
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
            active: alert.active
          }}
        />

        <div className="mb-3 mt-12 flex items-center gap-2">
          <History className="h-4 w-4 text-zinc-400" />
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Histórico recente</h2>
        </div>
        {(!history || history.length === 0) ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-zinc-500">
              Esse alerta ainda não disparou.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((h, idx) => (
              <Card key={h.id} className="card-hover hover:shadow-lifted animate-fade-up" >
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-semibold tabular-nums ${pctClass(h.pct_change)}`}>{formatPct(h.pct_change)}</span>
                      <span className="text-zinc-300">·</span>
                      <span className="font-mono text-xs text-zinc-700">
                        {formatPrice(h.price_reference, isUsd ? 'USD' : 'BRL')} → {formatPrice(h.price_now, isUsd ? 'USD' : 'BRL')}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{h.message}</p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-zinc-400">{relativeTime(h.sent_at)}</div>
                    <div className={`mt-0.5 font-semibold ${h.status === 'sent' ? 'text-emerald-600' : h.status === 'failed' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {h.status === 'sent' ? 'enviada' : h.status === 'failed' ? 'falhou' : 'na fila'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
