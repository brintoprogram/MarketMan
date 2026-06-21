import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, relativeTime } from '@/lib/format';
import { Bell, Plus, ArrowRight } from 'lucide-react';
import { CATEGORY_DOT } from '@/components/asset-card';

export const dynamic = 'force-dynamic';

export default async function AlertsList() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: alerts } = await supabase
    .from('alerts')
    .select(`
      id, alert_type, threshold_pct, comparison_type, comparison_days, active,
      reference_price, last_notified_at, created_at,
      target_price, target_direction,
      asset:assets(symbol, name, category, unit)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const activeCount = (alerts ?? []).filter((a: any) => a.active).length;
  const total = alerts?.length ?? 0;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="animate-fade-up">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
                Configurações
              </div>
              <h1 className="text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[36px]">
                Seus alertas
              </h1>
              <p className="num mt-2 text-[12px] text-ink-3">
                <span className="text-ink">{activeCount}</span> ativos · <span className="text-ink">{total}</span> total
              </p>
            </div>
            <Link href="/alerts/new" className="animate-fade-up-delay-1">
              <Button variant="brand" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Novo alerta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {total === 0 ? (
          <div className="animate-fade-up rounded-xl border border-line bg-panel p-12 text-center shadow-card">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
              <Bell className="h-5 w-5" />
            </div>
            <h3 className="mb-1 text-[15px] font-semibold text-ink">Nenhum alerta ainda</h3>
            <p className="mb-5 mx-auto max-w-md text-[12px] leading-relaxed text-ink-2">
              Configure seu primeiro alerta e receba avisos no WhatsApp quando o mercado se mexer.
              Você pode usar um <Link href="/templates" className="font-medium text-brand-ink hover:underline">template pronto</Link> ou criar do zero.
            </p>
            <div className="flex justify-center gap-2">
              <Link href="/templates"><Button variant="outline" size="sm">Ver templates</Button></Link>
              <Link href="/alerts/new"><Button variant="brand" size="sm">Criar do zero</Button></Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {(alerts ?? []).map((a: any, idx: number) => {
              const cat = a.asset?.category ?? '';
              const dot = CATEGORY_DOT[cat] ?? 'var(--ink-3)';
              const isUsd = a.asset?.unit?.includes('USD') ?? false;
              return (
                <Link
                  key={a.id}
                  href={`/alerts/${a.id}`}
                  className="group card-hover block rounded-md border border-line bg-panel px-4 py-3 transition animate-fade-up"
                  style={{ animationDelay: `${Math.min(idx, 8) * 25}ms` }}
                >
                  <div className="flex items-center gap-4">
                    {/* status pulse */}
                    <span className="flex-shrink-0">
                      {a.active
                        ? <span className="dot-active" />
                        : <span className="block h-1.5 w-1.5 rounded-full bg-line-strong" />}
                    </span>

                    {/* main */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[12.5px]">
                        <span
                          className="inline-block h-[7px] w-[7px] rounded-full"
                          style={{ background: dot }}
                          aria-hidden
                        />
                        <code className="num text-[11px] font-medium uppercase tracking-wider text-ink-3">
                          {a.asset?.symbol}
                        </code>
                        <h3 className="truncate font-semibold text-ink">{a.asset?.name}</h3>
                      </div>
                      <p className="mt-1 text-[12px] text-ink-2">
                        {a.alert_type === 'price_target' ? (
                          <>
                            <span className="text-ink-3">{directionLabel(a.target_direction)}</span>{' '}
                            <span className="num font-semibold text-ink">
                              {Number(a.target_price).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                            </span>{' '}
                            {a.asset?.unit && <span className="num text-[11px] text-ink-3">{a.asset.unit}</span>}
                          </>
                        ) : (
                          <>
                            <span>Variação ≥</span>{' '}
                            <span className="num font-semibold text-ink">{a.threshold_pct}%</span>{' '}
                            <span className="text-ink-3">· {comparisonLabel(a.comparison_type, a.comparison_days)}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* meta */}
                    <div className="hidden text-right md:block">
                      <div className="num text-[11px] text-ink-3">
                        {a.last_notified_at
                          ? <>último ping {relativeTime(a.last_notified_at)}</>
                          : <>nunca disparou</>}
                      </div>
                      {a.reference_price && (
                        <div className="num mt-0.5 text-[10px] text-ink-3">
                          ref {formatPrice(a.reference_price, isUsd ? 'USD' : 'BRL')}
                        </div>
                      )}
                    </div>

                    <ArrowRight className="hidden h-3.5 w-3.5 flex-shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-brand-ink sm:block" />
                  </div>
                </Link>
              );
            })}
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

function directionLabel(d: string | null): string {
  if (d === 'above') return 'subir acima de';
  if (d === 'below') return 'cair abaixo de';
  if (d === 'crosses') return 'cruzar';
  return 'atingir';
}
