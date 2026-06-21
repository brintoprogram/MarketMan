import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/settings-form';
import { QuietHoursForm } from '@/components/quiet-hours-form';
import { DailyLimitForm } from '@/components/daily-limit-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Info, ArrowRight } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: settings } = await supabase.from('app_settings').select('*');
  const cron = settings?.find((s) => s.key === 'cron_minutes')?.value as { minutes: number } | undefined;
  const rate = settings?.find((s) => s.key === 'rate_limit')?.value as { enabled: boolean; limit: number } | undefined;

  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase
    .from('rate_limit_usage').select('*').eq('date', today).maybeSingle();

  const { data: recentLogs } = await supabase
    .from('system_logs')
    .select('id, level, source, event, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(8);

  const [{ count: errorCount }, { count: warnCount }, { count: infoCount }] = await Promise.all([
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('level', 'error'),
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('level', 'warn'),
    supabase.from('system_logs').select('*', { count: 'exact', head: true }).eq('level', 'info')
  ]);

  const { data: prof } = await supabase
    .from('profiles')
    .select('quiet_hours_start, quiet_hours_end, daily_message_limit')
    .eq('id', user.id).single();

  const { data: usageRpc } = await supabase.rpc('count_user_messages_24h', { p_user_id: user.id });
  const userTodayCount = typeof usageRpc === 'number' ? usageRpc : 0;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <div className="animate-fade-up">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
              Sistema
            </div>
            <h1 className="text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[36px]">
              Configurações
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-2">
              Frequência de coleta, rate limit, janela de silêncio, anti-spam e observabilidade.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-5 px-5 py-8">
        <SettingsForm
          initialCronMinutes={cron?.minutes ?? 15}
          initialRateLimitEnabled={rate?.enabled ?? true}
          initialRateLimitDaily={rate?.limit ?? 1000}
          usage={{
            count: usage?.count ?? 0,
            blocked: usage?.blocked_count ?? 0,
            limit: rate?.limit ?? 1000,
            enabled: rate?.enabled ?? true
          }}
        />

        <QuietHoursForm
          initialStart={prof?.quiet_hours_start ?? null}
          initialEnd={prof?.quiet_hours_end ?? null}
        />

        <DailyLimitForm
          initialLimit={prof?.daily_message_limit ?? null}
          todayCount={userTodayCount}
        />

        {/* Logs recentes — mini-tabela */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
                  Observabilidade
                </div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand-ink" />
                  Logs recentes
                </CardTitle>
                <CardDescription>Últimos 8 eventos. Para tabela completa, abra a observabilidade.</CardDescription>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5 text-[11px]">
                {(errorCount ?? 0) > 0 && <CountPill color="down">{errorCount}</CountPill>}
                {(warnCount ?? 0) > 0 && <CountPill color="amber">{warnCount}</CountPill>}
                {(infoCount ?? 0) > 0 && <CountPill color="brand">{infoCount}</CountPill>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                  <th className="py-2 pl-5 pr-2 font-semibold">Nível</th>
                  <th className="px-2 py-2 font-semibold">Evento</th>
                  <th className="px-2 py-2 font-semibold">Fonte</th>
                  <th className="py-2 pl-2 pr-5 text-right font-semibold">Quando</th>
                </tr>
              </thead>
              <tbody>
                {(recentLogs ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-[12px] text-ink-3">Sem eventos ainda.</td></tr>
                )}
                {(recentLogs ?? []).map((l, i) => (
                  <tr key={l.id} className={`border-b border-line/60 ${i % 2 === 1 ? 'bg-panel-2/40' : ''}`}>
                    <td className="py-2 pl-5 pr-2">
                      <LevelDot level={l.level} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-[12px] font-medium text-ink">{l.event}</div>
                      {l.error_message && (
                        <div className="num truncate text-[10px] text-down" title={l.error_message}>{l.error_message}</div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <code className="num rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-ink-2">{l.source}</code>
                    </td>
                    <td className="py-2 pl-2 pr-5 text-right">
                      <span className="num text-[11px] text-ink-3">{relativeTime(l.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-end border-t border-line bg-panel-2/40 px-5 py-2.5">
              <Link href="/settings/logs" className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-ink hover:underline">
                Ver todos os logs <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sobre o sistema */}
        <Card>
          <CardHeader>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
              Infra
            </div>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4 text-brand-ink" />
              Sobre o sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <KV label="Fonte de cotações" value="brapi.dev (PRO)" />
            <KV label="WhatsApp gateway" value="Z-API" />
            <KV label="Banco de dados" value="Postgres · Supabase · sa-east-1" />
            <KV label="Frequência de coleta" value={`${cron?.minutes ?? 15} min`} />
            <KV label="Rate limit" value={rate?.enabled ? `${rate.limit}/dia ativo` : 'desligado'} />
            <KV label="Retry" value="backoff 1m → 5m → 30m → 2h → 6h (máx 5)" />
            <KV label="Webhook on-status" value="/api/whatsapp-status (configurar no painel Z-API)" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function CountPill({ color, children }: { color: 'down' | 'amber' | 'brand'; children: React.ReactNode }) {
  const cls =
    color === 'down'  ? 'bg-down-soft text-down'
    : color === 'amber' ? 'bg-[#F59E0B]/15 text-[#B45309]'
    : 'bg-brand-soft text-brand-ink';
  return (
    <span className={`num inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function LevelDot({ level }: { level: string }) {
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

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-[11.5px] text-ink-2">{label}</span>
      <span className="num text-[11.5px] text-ink">{value}</span>
    </div>
  );
}
