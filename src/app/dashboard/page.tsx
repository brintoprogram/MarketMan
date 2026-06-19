import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, formatPct, pctClass, relativeTime } from '@/lib/format';
import { ArrowRight, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.whatsapp_verified) redirect('/onboarding');

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit')
    .eq('active', true)
    .order('display_order');

  // pega última cotação + cotação de 24h atrás de cada ativo
  const assetIds = (assets ?? []).map((a) => a.id);
  const { data: quotes } = await supabase
    .from('quotes')
    .select('asset_id, price, fetched_at')
    .in('asset_id', assetIds)
    .gte('fetched_at', new Date(Date.now() - 36 * 3600 * 1000).toISOString())
    .order('fetched_at', { ascending: false });

  const latestByAsset = new Map<string, { price: number; fetched_at: string; price24h?: number }>();
  for (const q of quotes ?? []) {
    const cur = latestByAsset.get(q.asset_id);
    if (!cur) {
      latestByAsset.set(q.asset_id, { price: Number(q.price), fetched_at: q.fetched_at });
    } else if (!cur.price24h) {
      // pega o primeiro mais antigo que está acima de 24h em relação ao mais recente
      const latestTime = new Date(cur.fetched_at).getTime();
      const qTime = new Date(q.fetched_at).getTime();
      if (latestTime - qTime >= 23 * 3600 * 1000) {
        cur.price24h = Number(q.price);
      }
    }
  }

  const { count: alertCount } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mercado agora</h1>
            <p className="text-sm text-zinc-500">
              {alertCount ?? 0} alerta{alertCount === 1 ? '' : 's'} configurado{alertCount === 1 ? '' : 's'}
            </p>
          </div>
          <Link href="/alerts/new">
            <Button variant="brand">Criar alerta</Button>
          </Link>
        </div>

        {(!quotes || quotes.length === 0) && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Sem cotações ainda</p>
              <p className="text-amber-800">
                O cron de cotação roda a cada 15 minutos. Se acabou de configurar a chave da brapi,
                aguarde a próxima execução ou dispare manualmente a Edge Function <code className="rounded bg-amber-100 px-1">fetch-quotes</code>.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(assets ?? []).map((asset) => {
            const q = latestByAsset.get(asset.id);
            const pct = q && q.price24h ? ((q.price - q.price24h) / q.price24h) * 100 : null;
            return (
              <Link
                key={asset.id}
                href={`/alerts/new?asset=${asset.id}`}
                className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{asset.symbol}</div>
                    <div className="font-semibold text-zinc-900">{asset.name}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold tabular-nums">
                    {q ? formatPrice(q.price, asset.unit?.includes('USD') ? 'USD' : 'BRL') : '—'}
                  </div>
                  <div className={`text-sm font-medium tabular-nums ${pctClass(pct)}`}>
                    {formatPct(pct)}
                  </div>
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {q ? `Atualizado ${relativeTime(q.fetched_at)}` : 'Sem dados'}
                  {asset.unit && <span className="ml-2">· {asset.unit}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
