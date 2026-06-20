import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { ReportForm } from '@/components/report-form';
import { TestReportButton } from '@/components/test-report-button';
import { relativeTime } from '@/lib/format';
import { ArrowLeft, History } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function deleteReport(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from('scheduled_reports').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/reports');
  redirect('/reports');
}

async function toggleReport(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const nextActive = formData.get('next_active') === 'true';
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from('scheduled_reports').update({ active: nextActive }).eq('id', id).eq('user_id', user.id);
  revalidatePath(`/reports/${id}`);
}

export default async function ReportDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: report } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!report) notFound();

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit')
    .eq('active', true)
    .order('display_order');

  const { data: history } = await supabase
    .from('scheduled_report_history')
    .select('id, status, message, trigger_kind, sent_at')
    .eq('report_id', report.id)
    .order('sent_at', { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-10">
          <Link href="/reports" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
            <ArrowLeft className="h-3.5 w-3.5" />Voltar pra relatórios
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
            <div>
              <div className="mb-2 flex items-center gap-2">
                {report.active
                  ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/60"><span className="dot-active" />Ativo</span>
                  : <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200/60"><span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />Pausado</span>}
                <code className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700">{report.cron_expression}</code>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{report.name}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <TestReportButton reportId={report.id} />
              <form action={toggleReport}>
                <input type="hidden" name="id" value={report.id} />
                <input type="hidden" name="next_active" value={String(!report.active)} />
                <Button type="submit" variant="outline">{report.active ? 'Pausar' : 'Ativar'}</Button>
              </form>
              <form action={deleteReport}>
                <input type="hidden" name="id" value={report.id} />
                <Button type="submit" variant="destructive">Excluir</Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-6 py-10 animate-fade-up-delay-1">
        <ReportForm
          assets={assets ?? []}
          initial={{
            id: report.id,
            name: report.name,
            cron_expression: report.cron_expression,
            asset_ids: report.asset_ids,
            variations: report.variations,
            include_volume: report.include_volume,
            include_spread: report.include_spread,
            message_header: report.message_header,
            message_footer: report.message_footer
          }}
        />

        <div className="mb-3 mt-12 flex items-center gap-2">
          <History className="h-4 w-4 text-zinc-400" />
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Envios recentes</h2>
        </div>
        {(!history || history.length === 0) ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-zinc-500">
              Esse relatório ainda não foi enviado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((h: any) => (
              <Card key={h.id} className="card-hover hover:shadow-lifted animate-fade-up">
                <CardContent className="py-4">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-semibold ${
                        h.status === 'sent' ? 'text-emerald-600' :
                        h.status === 'failed' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {h.status === 'sent' ? 'enviado' : h.status === 'failed' ? 'falhou' : 'na fila'}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">{h.trigger_kind}</span>
                    </div>
                    <div className="text-xs text-zinc-400">{relativeTime(h.sent_at)}</div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700">Ver mensagem enviada</summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 font-mono text-[11px] text-zinc-800">{h.message}</pre>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
