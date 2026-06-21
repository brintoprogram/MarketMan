'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { Clock, Gauge, Power } from 'lucide-react';

interface Props {
  initialCronMinutes: number;
  initialRateLimitEnabled: boolean;
  initialRateLimitDaily: number;
  usage: { count: number; blocked: number; limit: number; enabled: boolean };
}

const PRESETS: { label: string; sub: string; value: number }[] = [
  { label: '5min',  sub: 'turbo',           value: 5 },
  { label: '15min', sub: 'recomendado',     value: 15 },
  { label: '30min', sub: '',                value: 30 },
  { label: '1h',    sub: '',                value: 60 },
  { label: '2h',    sub: '',                value: 120 },
  { label: '6h',    sub: '',                value: 360 },
  { label: '12h',   sub: '',                value: 720 },
  { label: '24h',   sub: 'econômico',       value: 1440 }
];

function describeNextCollection(minutes: number, now: Date = new Date()) {
  // Próximo múltiplo de N minutos em horário UTC (cron roda em UTC).
  // Pra UI mostramos em horário local do user.
  const local = new Date(now);
  const m = local.getMinutes();
  const remainder = (minutes - (m % minutes)) % minutes || minutes;
  const next = new Date(local.getTime() + remainder * 60 * 1000);
  next.setSeconds(0, 0);
  const hh = String(next.getHours()).padStart(2, '0');
  const mm = String(next.getMinutes()).padStart(2, '0');
  return { hh, mm, inMinutes: remainder };
}

export function SettingsForm({ initialCronMinutes, initialRateLimitEnabled, initialRateLimitDaily, usage }: Props) {
  const router = useRouter();
  const [cron, setCron] = useState(initialCronMinutes);
  const [customCron, setCustomCron] = useState(!PRESETS.some((p) => p.value === initialCronMinutes));
  const [rateEnabled, setRateEnabled] = useState(initialRateLimitEnabled);
  const [rateLimit, setRateLimit] = useState(initialRateLimitDaily);
  const [savingCron, setSavingCron] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  const next = useMemo(() => describeNextCollection(cron), [cron]);

  const usagePct = usage.limit > 0 ? Math.min(100, (usage.count / usage.limit) * 100) : 0;
  const usageWarn = usage.enabled && usagePct > 90;
  const usageCaut = usage.enabled && usagePct > 70 && !usageWarn;
  const usageBarBg = !usage.enabled ? 'bg-line-strong'
    : usageWarn ? 'bg-down'
    : usageCaut ? 'bg-[#F59E0B]'
    : 'bg-brand';

  async function saveCron() {
    setSavingCron(true);
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_frequency', minutes: cron })
    });
    const data = await res.json();
    setSavingCron(false);
    if (!res.ok) { toast.error('Não consegui salvar', data?.error ?? 'Falha'); return; }
    toast.success('Frequência atualizada', data.applied?.schedule ? `cron: ${data.applied.schedule}` : `${cron} min`);
    router.refresh();
  }

  async function saveRate() {
    setSavingRate(true);
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_rate_limit', enabled: rateEnabled, limit: rateLimit })
    });
    const data = await res.json();
    setSavingRate(false);
    if (!res.ok) { toast.error('Não consegui salvar', data?.error ?? 'Falha'); return; }
    toast.success(
      rateEnabled ? `Rate limit: ${rateLimit}/dia ativo` : 'Rate limit desligado',
      rateEnabled ? 'Quando bater, chamadas extras são bloqueadas e logadas.' : 'Sem teto de chamadas à brapi.'
    );
    router.refresh();
  }

  return (
    <>
      {/* ==================== FREQUÊNCIA ==================== */}
      <Card>
        <CardHeader>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
            Coleta
          </div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-ink" />
            Frequência de coleta
          </CardTitle>
          <CardDescription>
            De quanto em quanto tempo o cron dispara o <code className="rounded bg-panel-2 px-1 py-0.5 font-mono text-[10px] text-ink-2">fetch-quotes</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Presets segmented em grid */}
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {PRESETS.map((p) => {
              const active = !customCron && cron === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setCustomCron(false); setCron(p.value); }}
                  className={`flex flex-col items-center gap-0.5 rounded-md border px-2 py-2 transition ${
                    active
                      ? 'border-brand bg-brand-soft text-brand-ink shadow-card'
                      : 'border-line bg-panel text-ink-2 hover:border-line-strong hover:bg-panel-2'
                  }`}
                >
                  <span className={`num text-[12.5px] font-semibold ${active ? 'text-brand-ink' : 'text-ink'}`}>
                    {p.label}
                  </span>
                  {p.sub && <span className="text-[9.5px] font-medium uppercase tracking-wider opacity-70">{p.sub}</span>}
                </button>
              );
            })}
          </div>

          {/* Custom */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCustomCron(true)}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition ${
                customCron
                  ? 'border-brand bg-brand-soft text-brand-ink'
                  : 'border-line bg-panel text-ink-2 hover:border-line-strong hover:bg-panel-2'
              }`}
            >
              Customizar
            </button>
            {customCron && (
              <>
                <Input
                  type="number" min={1} max={1440}
                  value={cron} onChange={(e) => setCron(Number(e.target.value))}
                  className="num w-24"
                />
                <span className="text-[12px] text-ink-2">minutos</span>
              </>
            )}
          </div>

          {/* Próxima coleta */}
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-line bg-panel-2 px-3 py-2.5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Próxima coleta</div>
              <div className="num mt-0.5 text-[15px] font-medium text-ink">
                ~{next.inMinutes}min · {next.hh}:{next.mm}
              </div>
            </div>
            <span className="num text-[11px] text-ink-3">
              cron: {cron < 60 ? `*/${cron} * * * *` : cron % 60 === 0 ? `0 */${cron/60} * * *` : `*/${cron} * * * *`}
            </span>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveCron} disabled={savingCron} variant="brand" size="sm">
              {savingCron ? 'Aplicando…' : 'Aplicar frequência'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ==================== RATE LIMIT ==================== */}
      <Card>
        <CardHeader>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
            Provedor
          </div>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-brand-ink" />
            Rate limit da brapi
          </CardTitle>
          <CardDescription>
            Quantas chamadas à brapi por dia são permitidas. Cada ativo coletado conta como 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de uso */}
          <div className="rounded-md border border-line bg-panel-2 p-3.5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Uso hoje</span>
              <span className="num text-[13px]">
                <strong className="text-ink">{usage.count}</strong>
                <span className="text-ink-3"> / {usage.enabled ? usage.limit : '∞'}</span>
              </span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full transition-all duration-500 ${usageBarBg}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="num text-[10.5px] text-ink-3">
                {usage.enabled ? `${usagePct.toFixed(0)}% do teto` : 'sem teto ativo'}
              </span>
              {usage.blocked > 0 && (
                <span className="num text-[10.5px] font-medium text-down">
                  {usage.blocked} bloqueio{usage.blocked === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between rounded-md border border-line p-3">
            <div className="flex items-start gap-2.5">
              <Power className="mt-0.5 h-3.5 w-3.5 text-brand-ink" />
              <div>
                <div className="text-[12.5px] font-semibold text-ink">Rate limit ligado</div>
                <div className="mt-0.5 text-[11px] text-ink-2">Desligado = qualquer volume passa.</div>
              </div>
            </div>
            <Toggle value={rateEnabled} onChange={setRateEnabled} />
          </div>

          {/* Limit */}
          <div className="space-y-1.5">
            <Label htmlFor="rate-limit">Limite diário</Label>
            <Input
              id="rate-limit"
              type="number" min={0} max={100000}
              value={rateLimit} onChange={(e) => setRateLimit(Number(e.target.value))}
              disabled={!rateEnabled}
              className="num"
            />
            <p className="text-[11px] text-ink-3">
              Sugestão: <span className="num font-medium text-ink-2">1.000</span>. Cron 15min × 7 ativos ≈ <span className="num">672/dia</span>.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveRate} disabled={savingRate} variant="brand" size="sm">
              {savingRate ? 'Aplicando…' : 'Aplicar rate limit'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${value ? 'bg-brand' : 'bg-line-strong'}`}
      aria-pressed={value}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition ${value ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  );
}
