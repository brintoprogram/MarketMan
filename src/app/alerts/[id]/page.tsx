import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { AlertForm } from '@/components/alert-form';
import { formatPrice, formatPct, pctClass, relativeTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AlertDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: alert } = await supabase
    .from('alerts')
    .select('*, asset:assets(id, symbol, name, category, unit)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

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

  async function deleteAlert() {
    'use server';
    const sb = createClient();
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) return;
    await sb.from('alerts').delete().eq('id', params.id).eq('user_id', u.id);
    revalidatePath('/alerts');
    redirect('/alerts');
  }

  async function toggleAlert() {
    'use server';
    const sb = createClient();
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) return;
    await sb.from('alerts').update({ active: !alert.active }).eq('id', params.id).eq('user_id', u.id);
    revalidatePath(`/alerts/${params.id}`);
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{alert.asset?.name}</h1>
            <p className="text-sm text-zinc-500">
              {alert.asset?.symbol} · alerta {alert.active ? 'ativo' : 'pausado'}
            </p>
          </div>
          <div className="flex gap-2">
            <form action={toggleAlert}>
              <Button type="submit" variant="outline" size="sm">
                {alert.active ? 'Pausar' : 'Ativar'}
              </Button>
            </form>
            <form action={deleteAlert}>
              <Button type="submit" variant="destructive" size="sm">Excluir</Button>
            </form>
          </div>
        </div>

        <AlertForm
          assets={assets ?? []}
          initial={{
            id: alert.id,
            asset_id: alert.asset_id,
            threshold_pct: alert.threshold_pct,
            comparison_type: alert.comparison_type,
            comparison_days: alert.comparison_days,
            message_template: alert.message_template,
            active: alert.active
          }}
        />

        <h2 className="mb-3 mt-10 text-lg font-semibold">Histórico recente</h2>
        {(!history || history.length === 0) ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-zinc-500">
              Esse alerta ainda não disparou.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <Card key={h.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-medium tabular-nums ${pctClass(h.pct_change)}`}>
                        {formatPct(h.pct_change)}
                      </span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-zinc-700">
                        {formatPrice(h.price_reference, alert.asset?.unit?.includes('USD') ? 'USD' : 'BRL')} → {formatPrice(h.price_now, alert.asset?.unit?.includes('USD') ? 'USD' : 'BRL')}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{h.message}</p>
                  </div>
                  <div className="text-right text-xs text-zinc-400">
                    <div>{relativeTime(h.sent_at)}</div>
                    <div className={h.status === 'sent' ? 'text-emerald-600' : 'text-rose-600'}>{h.status}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
