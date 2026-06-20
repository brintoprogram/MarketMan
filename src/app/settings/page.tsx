import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/settings-form';
import { QuietHoursForm } from '@/components/quiet-hours-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, Info, Clock, Gauge } from 'lucide-react';
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
    .select('id, level, source, event, error_message, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(30);

  const errorCount = (recentLogs ?? []).filter((l) => l.level === 'error').length;
  const warnCount = (recentLogs ?? []).filter((l) => l.level === 'warn').length;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 py-10">
          <div className="animate-fade-up">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Sistema</div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Configurações</h1>
            <p className="mt-1 text-sm text-zinc-500">Frequência de coleta, rate limit, observabilidade.</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <QuietHoursForm
          initialStart={(await supabase.from('profiles').select('quiet_hours_start').eq('id', user.id).single()).data?.quiet_hours_start ?? null}
          initialEnd={(await supabase.from('profiles').select('quiet_hours_end').eq('id', user.id).single()).data?.quiet_hours_end ?? null}
        />
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

        {/* Logs recentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-brand-600" />
                  Logs do sistema
                </CardTitle>
                <CardDescription>Últimos 30 eventos de TODAS as fontes.</CardDescription>
              </div>
              <div className="flex gap-2">
                {errorCount > 0 && <Badge variant="danger">{errorCount} erros</Badge>}
                {warnCount > 0 && <Badge variant="commodity">{warnCount} avisos</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {(recentLogs ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">Nenhum log ainda.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(recentLogs ?? []).map((l) => (
                  <li key={l.id} className="flex items-start gap-3 py-2.5">
                    <span className={`mt-1.5 inline-flex h-2 w-2 flex-shrink-0 rounded-full ${
                      l.level === 'error' ? 'bg-rose-500' :
                      l.level === 'warn' ? 'bg-amber-500' :
                      l.level === 'info' ? 'bg-brand-500' : 'bg-zinc-300'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-zinc-900">{l.event}</span>
                        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">{l.source}</code>
                        <span className="text-zinc-400">{relativeTime(l.created_at)}</span>
                      </div>
                      {l.error_message && (
                        <p className="mt-0.5 truncate text-xs text-rose-600">{l.error_message}</p>
                      )}
                      {l.metadata && Object.keys(l.metadata).length > 0 && (
                        <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                          {JSON.stringify(l.metadata)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-zinc-100 pt-3 text-center">
              <Link href="/settings/logs" className="text-xs font-medium text-brand-700 hover:underline">
                Ver todos os logs →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Info do projeto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-brand-600" />
              Sobre os dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-700">
            <Row label="Fonte de cotações" value="brapi.dev (PRO)" />
            <Row label="WhatsApp gateway" value="Z-API" />
            <Row label="Banco de dados" value="Postgres (Supabase, sa-east-1)" />
            <Row label="Coleta" value={`Cron pg_cron a cada ${cron?.minutes ?? 15} minutos`} />
            <Row label="Rate limit" value={rate?.enabled ? `${rate.limit}/dia (ativo)` : 'desligado'} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-xs text-zinc-900">{value}</span>
    </div>
  );
}
