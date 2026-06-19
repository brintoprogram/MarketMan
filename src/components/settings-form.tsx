'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Clock, Gauge, Check, AlertTriangle } from 'lucide-react';

interface Props {
  initialCronMinutes: number;
  initialRateLimitEnabled: boolean;
  initialRateLimitDaily: number;
  usage: { count: number; blocked: number; limit: number; enabled: boolean };
}

const PRESETS = [
  { label: '5 minutos',     value: 5 },
  { label: '10 minutos',    value: 10 },
  { label: '15 minutos',    value: 15 },
  { label: '30 minutos',    value: 30 },
  { label: '1 hora',        value: 60 },
  { label: '2 horas',       value: 120 },
  { label: '6 horas',       value: 360 },
  { label: '12 horas',      value: 720 },
  { label: '1 vez ao dia (24h)', value: 1440 }
];

export function SettingsForm({ initialCronMinutes, initialRateLimitEnabled, initialRateLimitDaily, usage }: Props) {
  const router = useRouter();
  const [cron, setCron] = useState(initialCronMinutes);
  const [customCron, setCustomCron] = useState(false);
  const [rateEnabled, setRateEnabled] = useState(initialRateLimitEnabled);
  const [rateLimit, setRateLimit] = useState(initialRateLimitDaily);
  const [savingCron, setSavingCron] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok'|'error'; msg: string } | null>(null);

  const usagePct = usage.limit > 0 ? Math.min(100, (usage.count / usage.limit) * 100) : 0;
  const usageColor = !usage.enabled ? 'bg-zinc-300'
    : usagePct > 90 ? 'bg-rose-500'
    : usagePct > 70 ? 'bg-amber-500'
    : 'bg-brand-500';

  async function saveCron() {
    setSavingCron(true); setFeedback(null);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_frequency', minutes: cron })
    });
    const data = await res.json();
    setSavingCron(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', msg: data.error ?? 'Falha ao salvar' });
      return;
    }
    setFeedback({ kind: 'ok', msg: `Frequência atualizada — cron: ${data.applied?.schedule}` });
    router.refresh();
  }

  async function saveRate() {
    setSavingRate(true); setFeedback(null);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_rate_limit', enabled: rateEnabled, limit: rateLimit })
    });
    const data = await res.json();
    setSavingRate(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', msg: data.error ?? 'Falha ao salvar' });
      return;
    }
    setFeedback({ kind: 'ok', msg: rateEnabled ? `Rate limit: ${rateLimit}/dia ativo` : 'Rate limit desligado' });
    router.refresh();
  }

  return (
    <>
      {/* Frequência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600" />
            Frequência de coleta
          </CardTitle>
          <CardDescription>
            De quanto em quanto tempo o pg_cron dispara o <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">fetch-quotes</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Intervalo</Label>
            <div className="flex gap-2">
              <Select
                value={customCron ? 'custom' : String(cron)}
                onChange={(e) => {
                  if (e.target.value === 'custom') setCustomCron(true);
                  else { setCustomCron(false); setCron(Number(e.target.value)); }
                }}
                className="flex-1"
              >
                {PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
                <option value="custom">Customizado…</option>
              </Select>
              {customCron && (
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={cron}
                  onChange={(e) => setCron(Number(e.target.value))}
                  className="w-32"
                  placeholder="minutos"
                />
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {cron < 60
                ? `Cron: */${cron} * * * * (a cada ${cron} minutos)`
                : (cron % 60 === 0
                    ? `Cron: 0 */${cron/60} * * * (a cada ${cron/60} horas)`
                    : `Cron: */${cron} * * * *`)}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveCron} disabled={savingCron} variant="brand">
              {savingCron ? 'Aplicando...' : 'Aplicar frequência'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rate limit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-brand-600" />
            Rate limit da brapi
          </CardTitle>
          <CardDescription>
            Quantas chamadas à brapi por dia são permitidas. Cada ativo coletado conta como 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Uso atual */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Uso hoje</span>
              <span className="font-mono text-sm">
                <strong className="text-zinc-900">{usage.count}</strong>
                <span className="text-zinc-500"> / {usage.enabled ? usage.limit : '∞'}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div className={`h-full transition-all duration-500 ${usageColor}`} style={{ width: `${usagePct}%` }} />
            </div>
            {usage.blocked > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {usage.blocked} requisição{usage.blocked === 1 ? '' : 'ões'} bloqueada{usage.blocked === 1 ? '' : 's'} hoje
              </div>
            )}
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-4">
            <div>
              <Label htmlFor="rate-enabled">Rate limit ativo</Label>
              <p className="mt-1 text-xs text-zinc-500">
                Quando desligado, qualquer número de chamadas é permitido.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRateEnabled(!rateEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${rateEnabled ? 'bg-brand-500' : 'bg-zinc-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${rateEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Limit */}
          <div className="space-y-2">
            <Label htmlFor="rate-limit">Limite diário</Label>
            <Input
              id="rate-limit"
              type="number"
              min={0}
              max={100000}
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
              disabled={!rateEnabled}
              className="font-mono text-lg"
            />
            <p className="text-xs text-zinc-500">
              Default sugerido: <strong>1.000</strong>. Cron a cada 15min com 7 ativos = ~672/dia.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveRate} disabled={savingRate} variant="brand">
              {savingRate ? 'Aplicando...' : 'Aplicar rate limit'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {feedback && (
        <div className={`rounded-xl border px-4 py-3 text-sm shadow-soft ${
          feedback.kind === 'ok'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-200 bg-rose-50 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.kind === 'ok' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{feedback.msg}</span>
          </div>
        </div>
      )}
    </>
  );
}
