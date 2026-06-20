'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Moon, Check, AlertTriangle, Power } from 'lucide-react';

interface Props {
  initialStart: number | null;
  initialEnd: number | null;
}

export function QuietHoursForm({ initialStart, initialEnd }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialStart != null && initialEnd != null && initialStart !== initialEnd);
  const [start, setStart] = useState(initialStart ?? 22);
  const [end, setEnd] = useState(initialEnd ?? 7);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok'|'error'; msg: string } | null>(null);

  async function save() {
    setSaving(true); setFeedback(null);
    const supa = createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supa.from('profiles').update({
      quiet_hours_start: enabled ? start : null,
      quiet_hours_end: enabled ? end : null
    }).eq('id', user.id);
    setSaving(false);
    if (error) setFeedback({ kind: 'error', msg: error.message });
    else {
      setFeedback({ kind: 'ok', msg: enabled ? `Silêncio entre ${pad(start)}h e ${pad(end)}h (Brasília)` : 'Quiet hours desligado' });
      router.refresh();
    }
  }

  const hoursOption = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Moon className="h-5 w-5 text-brand-600" />Quiet hours</CardTitle>
        <CardDescription>
          Horário em que MarketMan <strong>não envia</strong> alertas nem relatórios. Útil pra não ser acordado no meio da madrugada.
          Horário de Brasília (UTC-3).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
          <div className="flex items-start gap-2">
            <Power className="mt-0.5 h-4 w-4 text-brand-600" />
            <div>
              <div className="text-sm font-semibold text-zinc-900">Ligado</div>
              <div className="text-xs text-zinc-500">Quando desligado, mensagens podem chegar a qualquer hora.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${enabled ? 'bg-brand-500' : 'bg-zinc-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start">Começa às</Label>
              <Select id="start" value={String(start)} onChange={(e) => setStart(Number(e.target.value))}>
                {hoursOption.map((h) => <option key={h} value={h}>{pad(h)}:00</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Termina às</Label>
              <Select id="end" value={String(end)} onChange={(e) => setEnd(Number(e.target.value))}>
                {hoursOption.map((h) => <option key={h} value={h}>{pad(h)}:00</option>)}
              </Select>
            </div>
            <p className="col-span-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 text-xs text-zinc-600">
              Vamos silenciar mensagens das <strong>{pad(start)}h</strong> até as <strong>{pad(end)}h</strong> (Brasília).
              {start > end && ` Esse intervalo cruza meia-noite — pega das ${pad(start)}h da noite até as ${pad(end)}h da manhã.`}
            </p>
          </div>
        )}

        {feedback && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            feedback.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
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

function pad(n: number): string { return String(n).padStart(2, '0'); }
