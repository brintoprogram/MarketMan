'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toast';
import { Moon, Power } from 'lucide-react';

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

  async function save() {
    setSaving(true);
    const supa = createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supa.from('profiles').update({
      quiet_hours_start: enabled ? start : null,
      quiet_hours_end: enabled ? end : null
    }).eq('id', user.id);
    setSaving(false);
    if (error) { toast.error('Não consegui salvar', error.message); return; }
    toast.success(
      enabled ? 'Quiet hours ativo' : 'Quiet hours desligado',
      enabled ? `Silêncio das ${pad(start)}h às ${pad(end)}h (Brasília)` : 'Mensagens podem chegar a qualquer hora.'
    );
    router.refresh();
  }

  const hoursOption = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Card>
      <CardHeader>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
          Janela
        </div>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-brand-ink" />
          Quiet hours
        </CardTitle>
        <CardDescription>
          Horário em que MarketMan <strong>não envia</strong> alertas nem relatórios. Horário de Brasília (UTC−3).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border border-line p-3">
          <div className="flex items-start gap-2.5">
            <Power className="mt-0.5 h-3.5 w-3.5 text-brand-ink" />
            <div>
              <div className="text-[12.5px] font-semibold text-ink">Ligado</div>
              <div className="mt-0.5 text-[11px] text-ink-2">Desligado = mensagens podem chegar a qualquer hora.</div>
            </div>
          </div>
          <Toggle value={enabled} onChange={setEnabled} />
        </div>

        {enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start">Começa às</Label>
              <Select id="start" value={String(start)} onChange={(e) => setStart(Number(e.target.value))} className="num">
                {hoursOption.map((h) => <option key={h} value={h}>{pad(h)}:00</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">Termina às</Label>
              <Select id="end" value={String(end)} onChange={(e) => setEnd(Number(e.target.value))} className="num">
                {hoursOption.map((h) => <option key={h} value={h}>{pad(h)}:00</option>)}
              </Select>
            </div>
            <p className="col-span-2 rounded-md border border-line bg-panel-2 px-3 py-2.5 text-[11px] leading-relaxed text-ink-2">
              Silêncio das <span className="num font-semibold text-ink">{pad(start)}h</span> às <span className="num font-semibold text-ink">{pad(end)}h</span>.
              {start > end && ' O intervalo cruza meia-noite — pega da noite até a manhã seguinte.'}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} variant="brand" size="sm">
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

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
