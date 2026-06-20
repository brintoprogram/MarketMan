import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { relativeTime } from '@/lib/format';
import { MessageCircle, Bell, CalendarClock, MessageSquare, AlertCircle, CheckCircle, Filter } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 60;

interface UnifiedMessage {
  kind: 'alert' | 'report' | 'command';
  id: string;
  sent_at: string;
  message: string;
  status: 'sent' | 'failed' | 'queued' | 'replied';
  ref_label?: string;
  command?: string;
}

export default async function MessagesPage({ searchParams }: { searchParams: { kind?: string; status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const filterKind = searchParams.kind;
  const filterStatus = searchParams.status;

  // 1. alertas + relatórios (via view unificada)
  let viewQuery = supabase.from('v_user_messages')
    .select('*').eq('user_id', user.id)
    .order('sent_at', { ascending: false }).limit(PAGE_SIZE);
  if (filterKind && filterKind !== 'all' && filterKind !== 'command') viewQuery = viewQuery.eq('kind', filterKind);
  if (filterStatus) viewQuery = viewQuery.eq('status', filterStatus);
  const { data: viewRows } = await viewQuery;

  // 2. comandos respondidos via webhook (logs)
  const { data: cmdLogs } = await supabase.from('system_logs')
    .select('id, created_at, metadata, event')
    .eq('user_id', user.id)
    .eq('source', 'api/whatsapp-webhook')
    .eq('event', 'command_replied')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  // unificar
  const unified: UnifiedMessage[] = [];
  for (const v of viewRows ?? []) {
    unified.push({
      kind: v.kind as 'alert' | 'report',
      id: v.id,
      sent_at: v.sent_at,
      message: v.message,
      status: v.status,
      ref_label: v.kind === 'alert'
        ? `${v.asset_symbol} · ${v.asset_name}`
        : v.report_name ?? 'Relatório'
    });
  }
  if (filterKind === 'command' || !filterKind || filterKind === 'all') {
    for (const c of cmdLogs ?? []) {
      unified.push({
        kind: 'command',
        id: `cmd-${c.id}`,
        sent_at: c.created_at,
        message: `↪ ${(c.metadata as any)?.command ?? ''}`,
        status: 'replied',
        command: (c.metadata as any)?.command ?? ''
      });
    }
  }

  unified.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  const items = unified.slice(0, PAGE_SIZE);

  // contagens pra filtros
  const [
    { count: alertSent },
    { count: alertFailed },
    { count: reportSent },
    { count: cmdCount }
  ] = await Promise.all([
    supabase.from('alert_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'sent'),
    supabase.from('alert_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'failed'),
    supabase.from('scheduled_report_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'sent'),
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('event', 'command_replied')
  ]);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 py-10">
          <div className="animate-fade-up">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Histórico</div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Mensagens</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Todas as mensagens entre você e o MarketMan via WhatsApp.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 animate-fade-up-delay-1">
            <FilterPill href="/messages" active={!filterKind} icon={<MessageCircle className="h-3 w-3" />}>
              Tudo
            </FilterPill>
            <FilterPill href="/messages?kind=alert" active={filterKind === 'alert'} icon={<Bell className="h-3 w-3" />} color="rose">
              Alertas ({alertSent ?? 0})
            </FilterPill>
            <FilterPill href="/messages?kind=report" active={filterKind === 'report'} icon={<CalendarClock className="h-3 w-3" />} color="brand">
              Relatórios ({reportSent ?? 0})
            </FilterPill>
            <FilterPill href="/messages?kind=command" active={filterKind === 'command'} icon={<MessageSquare className="h-3 w-3" />} color="violet">
              Comandos ({cmdCount ?? 0})
            </FilterPill>
            {filterKind !== 'command' && (
              <>
                <span className="mx-1 self-center text-xs text-zinc-400">·</span>
                <FilterPill href={`/messages${filterKind ? `?kind=${filterKind}&` : '?'}status=sent`} active={filterStatus === 'sent'} icon={<CheckCircle className="h-3 w-3" />} color="emerald">
                  Enviadas
                </FilterPill>
                <FilterPill href={`/messages${filterKind ? `?kind=${filterKind}&` : '?'}status=failed`} active={filterStatus === 'failed'} icon={<AlertCircle className="h-3 w-3" />} color="rose">
                  Falhas ({alertFailed ?? 0})
                </FilterPill>
              </>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {items.length === 0 ? (
          <div className="animate-fade-up rounded-2xl border-2 border-dashed border-zinc-200 bg-white/60 p-16 text-center backdrop-blur">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
              <MessageCircle className="h-7 w-7" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-zinc-900">Nenhuma mensagem aqui</h3>
            <p className="text-sm text-zinc-500">Quando alertas ou relatórios disparam, aparecem aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((m) => (
              <MessageCard key={`${m.kind}-${m.id}`} msg={m} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function MessageCard({ msg }: { msg: UnifiedMessage }) {
  const kindMeta = {
    alert:   { icon: <Bell className="h-4 w-4" />, color: 'text-rose-600 bg-rose-50 ring-rose-200/60', label: 'Alerta' },
    report:  { icon: <CalendarClock className="h-4 w-4" />, color: 'text-brand-700 bg-brand-50 ring-brand-200/60', label: 'Relatório' },
    command: { icon: <MessageSquare className="h-4 w-4" />, color: 'text-violet-700 bg-violet-50 ring-violet-200/60', label: 'Comando' }
  }[msg.kind];

  const statusColor = msg.status === 'sent' ? 'text-emerald-600'
    : msg.status === 'failed' ? 'text-rose-600'
    : msg.status === 'replied' ? 'text-violet-600'
    : 'text-amber-600';

  return (
    <div className="card-hover overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-soft hover:shadow-lifted">
      <div className="flex items-start gap-3 p-5">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${kindMeta.color}`}>
          {kindMeta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-zinc-900">{kindMeta.label}</span>
              {msg.ref_label && <span className="text-zinc-500">· {msg.ref_label}</span>}
              {msg.command && <code className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] text-violet-700">{msg.command}</code>}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`font-semibold ${statusColor}`}>
                {msg.status === 'sent' ? 'enviado' : msg.status === 'failed' ? 'falhou' : msg.status === 'replied' ? 'respondido' : msg.status}
              </span>
              <span className="text-zinc-400">{relativeTime(msg.sent_at)}</span>
            </div>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700">Ver mensagem</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 font-mono text-[11px] leading-relaxed text-zinc-800">{msg.message}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function FilterPill({ href, active, icon, color = 'zinc', children }: {
  href: string; active: boolean; icon?: React.ReactNode; color?: string; children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    zinc:    active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
    rose:    active ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
    brand:   active ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    violet:  active ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    emerald: active ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
  };
  return (
    <Link href={href} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${colorMap[color] ?? colorMap.zinc}`}>
      {icon}{children}
    </Link>
  );
}
