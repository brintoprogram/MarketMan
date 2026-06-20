'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { MessageSquareOff, Check, AlertTriangle, Power } from 'lucide-react';

interface Props {
  initialLimit: number | null;
  todayCount: number;
}

export function DailyLimitForm({ initialLimit, todayCount }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialLimit != null);
  const [limit, setLimit] = useState(initialLimit ?? 20);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok'|'error'; msg: string } | null>(null);

  async function save() {
    setSaving(true); setFeedback(null);
    const supa = createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supa.from('profiles').update({
      daily_message_limit: enabled ? limit : null
    }).eq('id', user.id);
    setSaving(false);
    if (error) setFeedback({ kind: 'error', msg: error.message });
    else { setFeedback({ kind: 'ok', msg: enabled ? `Limite: ${limit} mensagens / 24h` : 'Limite desligado' }); router.refresh(); }
  }

  const usagePct = enabled && limit > 0 ? Math.min(100, (todayCount / limit) * 100) : 0;
  const usageColor = !enabled ? 'bg-zinc-300'
    : usagePct > 90 ? 'bg-rose-500'
    : usagePct > 70 ? 'bg-amber-500'
    : 'bg-brand-500';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageSquareOff className="h-5 w-5 text-brand-600" />Limite diário de mensagens</CardTitle>
        <CardDescription>
          Máximo de mensagens (alertas + relatórios) que você quer receber em 24 horas.
          Evita ser bombardeado em dia volátil. Quando bate, alertas viram skip; relatórios também.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* uso atual */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recebido nas últimas 24h</span>
            <span className="font-mono text-sm">
              <strong className="text-zinc-900">{todayCount}</strong>
              <span className="text-zinc-500"> / {enabled ? limit : '∞'}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
            <div className={`h-full transition-all duration-500 ${usageColor}`} style={{ width: `${usagePct}%` }} />
          </div>
        </div>

        {/* toggle */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
          <div className="flex items-start gap-2">
            <Power className="mt-0.5 h-4 w-4 text-brand-600" />
            <div>
              <div className="text-sm font-semibold text-zinc-900">Ligado</div>
              <div className="text-xs text-zinc-500">Quando desligado, sem teto de mensagens.</div>
            </div>
          </div>
          <button type="button" onClick={() => setEnabled(!enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${enabled ? 'bg-brand-500' : 'bg-zinc-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {enabled && (
          <div className="space-y-2">
            <Label htmlFor="limit">Limite (mensagens / 24h)</Label>
            <Input id="limit" type="number" min={1} max={500} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="font-mono text-lg" />
          </div>
        )}

        {feedback && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${feedback.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {feedback.kind === 'ok' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {feedback.msg}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} variant="brand">{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
