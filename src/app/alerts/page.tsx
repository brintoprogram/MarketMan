import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Badge, categoryVariant, categoryLabel } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, relativeTime } from '@/lib/format';
import { Bell, Plus, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AlertsList() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: alerts } = await supabase
    .from('alerts')
    .select(`
      id, threshold_pct, comparison_type, comparison_days, active, reference_price, last_notified_at, created_at,
      asset:assets(symbol, name, category, unit)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const activeCount = (alerts ?? []).filter((a: any) => a.active).length;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />

      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-end justify-between gap-6">
            <div className="animate-fade-up">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Configurações</div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Seus alertas</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {activeCount} ativo{activeCount === 1 ? '' : 's'} de {alerts?.length ?? 0} configurado{alerts?.length === 1 ? '' : 's'}
              </p>
            </div>
            <Link href="/alerts/new" className="animate-fade-up-delay-1">
              <Button variant="brand" size="lg">
                <Plus className="h-4 w-4" />
                Novo alerta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {(!alerts || alerts.length === 0) ? (
          <div className="animate-fade-up rounded-2xl border-2 border-dashed border-zinc-200 bg-white/60 p-16 text-center backdrop-blur">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
              <Bell className="h-7 w-7" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-zinc-900">Nenhum alerta ainda</h3>
            <p className="mb-6 text-sm text-zinc-500">Configure seu primeiro alerta e receba avisos no WhatsApp.</p>
            <Link href="/alerts/new">
              <Button variant="brand" size="lg">Criar primeiro alerta</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a: any, idx: number) => (
              <Link
                key={a.id}
                href={`/alerts/${a.id}`}
                className="group card-hover relative block overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft hover:border-brand-300/80 hover:shadow-lifted animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-center gap-5">
                  {/* status dot */}
                  <div className="flex-shrink-0">
                    {a.active
                      ? <span className="dot-active" />
                      : <span className="block h-2 w-2 rounded-full bg-zinc-300" />}
                  </div>

                  {/* main */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={categoryVariant(a.asset?.category ?? 'muted')}>
                        {categoryLabel(a.asset?.category ?? '')}
                      </Badge>
                      <h3 className="truncate font-semibold text-zinc-900">{a.asset?.name}</h3>
                      <span className="font-mono text-xs text-zinc-400">{a.asset?.symbol}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-zinc-600">
                      Variação ≥ <strong className="font-semibold text-zinc-900">{a.threshold_pct}%</strong>
                      {' · '}
                      <span className="text-zinc-500">{comparisonLabel(a.comparison_type, a.comparison_days)}</span>
                    </p>
                  </div>

                  {/* meta */}
                  <div className="hidden text-right text-xs text-zinc-500 md:block">
                    <div>
                      {a.last_notified_at
                        ? `Último alerta ${relativeTime(a.last_notified_at)}`
                        : 'Ainda não disparou'}
                    </div>
                    {a.reference_price && (
                      <div className="mt-1 text-zinc-400">
                        Ref: <span className="font-mono">{formatPrice(a.reference_price, a.asset?.unit?.includes('USD') ? 'USD' : 'BRL')}</span>
                      </div>
                    )}
                  </div>

                  <ArrowRight className="hidden h-4 w-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 sm:block" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function comparisonLabel(type: string, days: number | null) {
  if (type === 'last_message') return 'desde a última mensagem';
  if (type === 'days' && days === 7) return 'comparando com 7 dias atrás';
  if (type === 'days' && days === 30) return 'comparando com 30 dias atrás';
  if (type === 'days') return `comparando com ${days} dias atrás`;
  return type;
}
