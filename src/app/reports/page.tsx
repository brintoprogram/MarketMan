import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { relativeTime } from '@/lib/format';
import { CalendarClock, Plus, MessageCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsList() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: reports } = await supabase
    .from('scheduled_reports')
    .select('id, name, cron_expression, asset_ids, variations, include_volume, include_spread, active, last_sent_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const activeCount = (reports ?? []).filter((r) => r.active).length;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-end justify-between gap-6">
            <div className="animate-fade-up">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Automação</div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Relatórios agendados</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {activeCount} ativo{activeCount === 1 ? '' : 's'} de {reports?.length ?? 0} configurado{reports?.length === 1 ? '' : 's'} ·
                tabelas personalizadas enviadas no WhatsApp em horários definidos
              </p>
            </div>
            <Link href="/reports/new" className="animate-fade-up-delay-1">
              <Button variant="brand" size="lg">
                <Plus className="h-4 w-4" />
                Novo relatório
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Dica de comandos */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand-200/60 bg-brand-50/40 p-5 shadow-soft animate-fade-up">
          <div className="rounded-lg bg-brand-100 p-2 text-brand-700">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-brand-900">Comandos no WhatsApp já estão ativos</p>
            <p className="mt-1 text-brand-800">
              Responda <code className="rounded bg-brand-100 px-1 font-mono text-xs">AJUDA</code> no seu número pra ver o menu.
              Funciona com: <strong>PREÇO ICF</strong> · <strong>PREÇOS</strong> · <strong>STATUS</strong> · <strong>PAUSAR 24H</strong> · <strong>ATIVAR</strong> · <strong>PARAR</strong>.
            </p>
          </div>
        </div>

        {(!reports || reports.length === 0) ? (
          <div className="animate-fade-up rounded-2xl border-2 border-dashed border-zinc-200 bg-white/60 p-16 text-center backdrop-blur">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
              <CalendarClock className="h-7 w-7" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-zinc-900">Nenhum relatório ainda</h3>
            <p className="mb-6 text-sm text-zinc-500">Crie tabelas personalizadas pra receber resumos no horário que quiser.</p>
            <Link href="/reports/new">
              <Button variant="brand" size="lg">Criar primeiro relatório</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r, idx) => (
              <Link
                key={r.id}
                href={`/reports/${r.id}`}
                className="group card-hover relative block overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft hover:border-brand-300/80 hover:shadow-lifted animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-center gap-5">
                  <div className="flex-shrink-0">
                    {r.active
                      ? <span className="dot-active" />
                      : <span className="block h-2 w-2 rounded-full bg-zinc-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-zinc-900">{r.name}</h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      <span className="font-mono text-xs text-zinc-500">{r.cron_expression}</span>
                      {' · '}
                      <span>{r.asset_ids?.length ?? 0} ativo{r.asset_ids?.length === 1 ? '' : 's'}</span>
                      {' · '}
                      <span>{(r.variations ?? []).join(', ')}</span>
                      {r.include_volume && ' · volume'}
                      {r.include_spread && ' · spread'}
                    </p>
                  </div>
                  <div className="hidden text-right text-xs text-zinc-500 md:block">
                    {r.last_sent_at ? <>Último envio<br />{relativeTime(r.last_sent_at)}</> : 'Ainda não enviado'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
