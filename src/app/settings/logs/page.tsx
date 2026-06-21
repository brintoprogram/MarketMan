import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { relativeTime } from '@/lib/format';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

export default async function LogsPage({ searchParams }: { searchParams: { level?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let q = supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE);
  if (searchParams.level) q = q.eq('level', searchParams.level);
  const { data: logs } = await q;

  const counts = await Promise.all([
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('level', 'error'),
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('level', 'warn'),
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('level', 'info'),
    supabase.from('system_logs').select('*', { count: 'exact', head: true })
  ]);
  const errCount = counts[0].count ?? 0;
  const warnCount = counts[1].count ?? 0;
  const infoCount = counts[2].count ?? 0;
  const totalCount = counts[3].count ?? 0;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <Link
            href="/settings"
            className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar pra configurações
          </Link>
          <div className="animate-fade-up">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
              Observabilidade
            </div>
            <h1 className="text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[36px]">
              Logs do sistema
            </h1>
            <p className="num mt-2 text-[12px] text-ink-3">
              Mostrando <span className="text-ink">{logs?.length ?? 0}</span> de <span className="text-ink">{totalCount}</span> eventos.
            </p>
          </div>

          {/* Segmented por nível */}
          <div className="mt-5 flex flex-wrap gap-1.5 animate-fade-up-delay-1">
            <SegLink href="/settings/logs"           active={!searchParams.level}             count={totalCount} color="ink">Todos</SegLink>
            <SegLink href="/settings/logs?level=error" active={searchParams.level === 'error'} count={errCount}   color="down">Erros</SegLink>
            <SegLink href="/settings/logs?level=warn"  active={searchParams.level === 'warn'}  count={warnCount}  color="amber">Avisos</SegLink>
            <SegLink href="/settings/logs?level=info"  active={searchParams.level === 'info'}  count={infoCount}  color="brand">Info</SegLink>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="overflow-hidden rounded-md border border-line bg-panel shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-panel-2/40 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                <th className="py-2.5 pl-5 pr-2 font-semibold">Quando</th>
                <th className="px-2 py-2.5 font-semibold">Nível</th>
                <th className="px-2 py-2.5 font-semibold">Fonte</th>
                <th className="px-2 py-2.5 font-semibold">Evento</th>
                <th className="px-2 py-2.5 font-semibold">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l: any, i: number) => (
                <tr key={l.id} className={`border-b border-line/60 align-top ${i % 2 === 1 ? 'bg-panel-2/30' : ''} transition-colors hover:bg-brand-soft/40`}>
                  <td className="py-2.5 pl-5 pr-2">
                    <span className="num text-[11px] text-ink-2">{relativeTime(l.created_at)}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <LevelTag level={l.level} />
                  </td>
                  <td className="px-2 py-2.5">
                    <code className="num rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-ink-2">{l.source}</code>
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="text-[12px] font-medium text-ink">{l.event}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    {l.error_message && (
                      <p className="num text-[10.5px] text-down">{l.error_message}</p>
                    )}
                    {l.request_url && (
                      <p className="num truncate text-[10px] text-ink-3" title={l.request_url}>
                        {l.request_url}
                      </p>
                    )}
                    {(l.response_status || l.duration_ms) && (
                      <p className="num text-[10px] text-ink-3">
                        {l.response_status && <span>HTTP {l.response_status}</span>}
                        {l.response_status && l.duration_ms && <span> · </span>}
                        {l.duration_ms && <span>{l.duration_ms}ms</span>}
                      </p>
                    )}
                    {l.metadata && Object.keys(l.metadata).length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer select-none text-[10px] text-ink-3 hover:text-ink">metadata</summary>
                        <pre className="num mt-1 overflow-x-auto rounded border border-line bg-panel-2 p-2 font-mono text-[10px] text-ink-2">{JSON.stringify(l.metadata, null, 2)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[12px] text-ink-3">
                    Nenhum log com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function SegLink({ href, active, count, color, children }: {
  href: string; active: boolean; count: number;
  color: 'ink' | 'down' | 'amber' | 'brand';
  children: React.ReactNode;
}) {
  // ativo = bg-ink/text-bg, inativo = panel hairline + texto da cor
  const activeColor =
    color === 'ink'   ? 'bg-ink text-bg'
    : color === 'down'  ? 'bg-down text-white'
    : color === 'amber' ? 'bg-[#F59E0B] text-white'
    : 'bg-brand text-white';
  const inactiveText =
    color === 'down'  ? 'text-down hover:bg-down-soft'
    : color === 'amber' ? 'text-[#B45309] hover:bg-[#F59E0B]/10'
    : color === 'brand' ? 'text-brand-ink hover:bg-brand-soft'
    : 'text-ink-2 hover:bg-panel-2';
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-semibold transition ${
        active ? `${activeColor} border-transparent` : `border-line bg-panel ${inactiveText}`
      }`}
    >
      {children}
      <span className={`num rounded-sm px-1 text-[10px] font-medium ${
        active ? 'bg-white/20 text-white' : 'bg-panel-2 text-ink-3'
      }`}>
        {count}
      </span>
    </Link>
  );
}

function LevelTag({ level }: { level: string }) {
  const dot =
    level === 'error' ? 'bg-down'
    : level === 'warn' ? 'bg-[#F59E0B]'
    : level === 'info' ? 'bg-brand'
    : 'bg-line-strong';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{level}</span>
    </span>
  );
}
