import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { relativeTime } from '@/lib/format';
import { ArrowLeft, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

export default async function LogsPage({ searchParams }: { searchParams: { level?: string; source?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let q = supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE);
  if (searchParams.level) q = q.eq('level', searchParams.level);
  if (searchParams.source) q = q.eq('source', searchParams.source);
  const { data: logs } = await q;

  const counts = await Promise.all([
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('level', 'error'),
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('level', 'warn'),
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('level', 'info')
  ]);
  const errCount = counts[0].count ?? 0;
  const warnCount = counts[1].count ?? 0;
  const infoCount = counts[2].count ?? 0;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 py-10">
          <Link href="/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
            <ArrowLeft className="h-3.5 w-3.5" />Voltar pra configurações
          </Link>
          <div className="animate-fade-up">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Observabilidade</div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Logs do sistema</h1>
            <p className="mt-1 text-sm text-zinc-500">Mostrando {logs?.length ?? 0} eventos mais recentes.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 animate-fade-up-delay-1">
            <FilterPill href="/settings/logs" active={!searchParams.level} count={errCount + warnCount + infoCount}>Todos</FilterPill>
            <FilterPill href="/settings/logs?level=error" active={searchParams.level === 'error'} count={errCount} color="rose">Erros</FilterPill>
            <FilterPill href="/settings/logs?level=warn" active={searchParams.level === 'warn'} count={warnCount} color="amber">Avisos</FilterPill>
            <FilterPill href="/settings/logs?level=info" active={searchParams.level === 'info'} count={infoCount} color="brand">Info</FilterPill>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-soft">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Nível</th>
                <th className="px-4 py-3">Fonte</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {(logs ?? []).map((l: any) => (
                <tr key={l.id} className="align-top hover:bg-zinc-50/50">
                  <td className="px-4 py-3 text-xs text-zinc-500">{relativeTime(l.created_at)}</td>
                  <td className="px-4 py-3">
                    <LevelBadge level={l.level} />
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700">{l.source}</code>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{l.event}</td>
                  <td className="px-4 py-3">
                    {l.error_message && (
                      <p className="mb-1 font-mono text-xs text-rose-700">{l.error_message}</p>
                    )}
                    {l.request_url && (
                      <p className="truncate font-mono text-[10px] text-zinc-500" title={l.request_url}>
                        {l.request_url}
                      </p>
                    )}
                    {(l.response_status || l.duration_ms) && (
                      <p className="text-[10px] text-zinc-400">
                        {l.response_status && <span>HTTP {l.response_status} · </span>}
                        {l.duration_ms && <span>{l.duration_ms}ms</span>}
                      </p>
                    )}
                    {l.metadata && Object.keys(l.metadata).length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600">metadata</summary>
                        <pre className="mt-1 overflow-x-auto rounded bg-zinc-50 p-2 font-mono text-[10px] text-zinc-700">{JSON.stringify(l.metadata, null, 2)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">Nenhum log com esses filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function FilterPill({ href, active, count, color = 'zinc', children }: {
  href: string; active: boolean; count: number; color?: string; children: React.ReactNode;
}) {
  const colorClasses: Record<string, string> = {
    zinc:   active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
    rose:   active ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
    amber:  active ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100',
    brand:  active ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
  };
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${colorClasses[color] ?? colorClasses.zinc}`}
    >
      {children}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/20' : 'bg-white/60'}`}>{count}</span>
    </Link>
  );
}

function LevelBadge({ level }: { level: string }) {
  if (level === 'error') return <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/60"><AlertCircle className="h-3 w-3" />error</span>;
  if (level === 'warn')  return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/60"><AlertTriangle className="h-3 w-3" />warn</span>;
  if (level === 'info')  return <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200/60"><Info className="h-3 w-3" />info</span>;
  return <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">{level}</span>;
}
