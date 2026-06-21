'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toast';
import { MessageSquareOff, Power } from 'lucide-react';

interface Props {
  initialLimit: number | null;
  todayCount: number;
}

export function DailyLimitForm({ initialLimit, todayCount }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialLimit != null);
  const [limit, setLimit] = useState(initialLimit ?? 20);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supa = createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supa.from('profiles').update({
      daily_message_limit: enabled ? limit : null
    }).eq('id', user.id);
    setSaving(false);
    if (error) { toast.error('Não consegui salvar', error.message); return; }
    toast.success(
      enabled ? `Limite: ${limit} msgs / 24h` : 'Limite desligado',
      enabled ? 'Alertas/relatórios além desse teto viram skip.' : 'Sem teto de mensagens.'
    );
    router.refresh();
  }

  const usagePct = enabled && limit > 0 ? Math.min(100, (todayCount / limit) * 100) : 0;
  const usageWarn = enabled && usagePct > 90;
  const usageCaut = enabled && usagePct > 70 && !usageWarn;
  const usageBarBg = !enabled ? 'bg-line-strong'
    : usageWarn ? 'bg-down'
    : usageCaut ? 'bg-[#F59E0B]'
    : 'bg-brand';

  return (
    <Card>
      <CardHeader>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
          Anti-spam
        </div>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareOff className="h-4 w-4 text-brand-ink" />
          Limite diário de mensagens
        </CardTitle>
        <CardDescription>
          Máx. de mensagens (alertas + relatórios) por 24h. Evita bombardeio em dia volátil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Uso atual */}
        <div className="rounded-md border border-line bg-panel-2 p-3.5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Últimas 24h</span>
            <span className="num text-[13px]">
              <strong className="text-ink">{todayCount}</strong>
              <span className="text-ink-3"> / {enabled ? limit : '∞'}</span>
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-line">
            <div className={`h-full transition-all duration-500 ${usageBarBg}`} style={{ width: `${usagePct}%` }} />
          </div>
          <div className="mt-2">
            <span className="num text-[10.5px] text-ink-3">
              {enabled ? `${usagePct.toFixed(0)}% do teto` : 'sem teto ativo'}
            </span>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between rounded-md border border-line p-3">
          <div className="flex items-start gap-2.5">
            <Power className="mt-0.5 h-3.5 w-3.5 text-brand-ink" />
            <div>
              <div className="text-[12.5px] font-semibold text-ink">Ligado</div>
              <div className="mt-0.5 text-[11px] text-ink-2">Desligado = sem teto de mensagens.</div>
            </div>
          </div>
          <Toggle value={enabled} onChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-1.5">
            <Label htmlFor="limit">Limite (msgs / 24h)</Label>
            <Input
              id="limit"
              type="number" min={1} max={500}
              value={limit} onChange={(e) => setLimit(Number(e.target.value))}
              className="num"
            />
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
