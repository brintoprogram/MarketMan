import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, relativeTime } from '@/lib/format';
import { Bell, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AlertsList() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: alerts } = await supabase
    .from('alerts')
    .select(`
      id, threshold_pct, comparison_type, comparison_days, active, reference_price, last_notified_at, created_at,
      asset:assets(symbol, name, unit)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Seus alertas</h1>
            <p className="text-sm text-zinc-500">Configurações de monitoramento ativas</p>
          </div>
          <Link href="/alerts/new">
            <Button variant="brand">
              <Plus className="h-4 w-4" />
              Novo alerta
            </Button>
          </Link>
        </div>

        {(!alerts || alerts.length === 0) ? (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <h3 className="mb-1 font-semibold">Nenhum alerta ainda</h3>
            <p className="mb-4 text-sm text-zinc-500">
              Crie seu primeiro alerta e receba avisos no WhatsApp.
            </p>
            <Link href="/alerts/new">
              <Button variant="brand">Criar primeiro alerta</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a: any) => (
              <Link
                key={a.id}
                href={`/alerts/${a.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${a.active ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                      <h3 className="font-semibold">{a.asset?.name}</h3>
                      <span className="text-xs text-zinc-400">{a.asset?.symbol}</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">
                      Variação ≥ <strong>{a.threshold_pct}%</strong>
                      {' · '}
                      {comparisonLabel(a.comparison_type, a.comparison_days)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-400">
                    {a.last_notified_at
                      ? `Último alerta ${relativeTime(a.last_notified_at)}`
                      : 'Nunca disparou'}
                    {a.reference_price && (
                      <div className="mt-1">
                        Ref: {formatPrice(a.reference_price, a.asset?.unit?.includes('USD') ? 'USD' : 'BRL')}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function comparisonLabel(type: string, days: number | null) {
  if (type === 'last_message') return 'desde a última mensagem';
  if (type === 'days' && days === 7) return 'desde 7 dias atrás';
  if (type === 'days' && days === 30) return 'desde 30 dias atrás';
  if (type === 'days') return `desde ${days} dias atrás`;
  return type;
}
