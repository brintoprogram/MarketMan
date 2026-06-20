'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge, categoryVariant, categoryLabel } from '@/components/ui/badge';
import { RecipientPicker, type RecipientOption } from '@/components/recipient-picker';
import { createClient } from '@/lib/supabase/client';
import { Clock, Layers, BarChart3, Calendar, Search, Users } from 'lucide-react';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: string;
  unit: string | null;
}

interface Props {
  assets: Asset[];
  recipients?: RecipientOption[];
  initial?: {
    id: string;
    name: string;
    cron_expression: string;
    asset_ids: string[];
    variations: string[];
    include_volume: boolean;
    include_spread: boolean;
    message_header: string | null;
    message_footer: string | null;
    recipient_ids?: string[] | null;
  };
}

const CRON_PRESETS = [
  { label: 'Diário às 8h (UTC-3, dias úteis)',    value: '0 11 * * 1-5' },
  { label: 'Diário às 8h (todos os dias)',         value: '0 11 * * *' },
  { label: 'Diário ao meio-dia (UTC-3)',           value: '0 15 * * 1-5' },
  { label: 'Fechamento 18h (UTC-3, dias úteis)',   value: '0 21 * * 1-5' },
  { label: 'Sextas às 18h (UTC-3)',                value: '0 21 * * 5' },
  { label: 'Domingo às 20h (UTC-3)',               value: '0 23 * * 0' },
  { label: 'A cada 4 horas',                       value: '0 */4 * * *' },
  { label: 'A cada 1 hora (horários comerciais)',  value: '0 11-21 * * 1-5' }
];

const VARIATION_OPTIONS = [
  { value: '1d', label: '24h' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' }
];

export function ReportForm({ assets, recipients = [], initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? 'Resumo diário');
  const [cron, setCron] = useState(initial?.cron_expression ?? '0 11 * * 1-5');
  const [useCustomCron, setUseCustomCron] = useState(
    initial ? !CRON_PRESETS.some((p) => p.value === initial.cron_expression) : false
  );
  const [assetIds, setAssetIds] = useState<string[]>(initial?.asset_ids ?? []);
  const [variations, setVariations] = useState<string[]>(initial?.variations ?? ['1d', '7d']);
  const [includeVolume, setIncludeVolume] = useState(initial?.include_volume ?? false);
  const [includeSpread, setIncludeSpread] = useState(initial?.include_spread ?? false);
  const [header, setHeader] = useState(initial?.message_header ?? '');
  const [footer, setFooter] = useState(initial?.message_footer ?? '');
  const [recipientIds, setRecipientIds] = useState<string[]>(initial?.recipient_ids ?? []);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return assets;
    return assets.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  }, [assets, search]);

  function toggleAsset(id: string) {
    setAssetIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function moveAsset(idx: number, dir: -1 | 1) {
    setAssetIds((prev) => {
      const next = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= next.length) return prev;
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  function toggleVariation(v: string) {
    setVariations((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supa = createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { setError('Sessão expirada'); setLoading(false); return; }
    if (assetIds.length === 0) { setError('Escolha pelo menos um ativo'); setLoading(false); return; }
    if (variations.length === 0) { setError('Escolha pelo menos uma variação'); setLoading(false); return; }

    const payload = {
      user_id: user.id,
      name: name.trim(),
      cron_expression: cron.trim(),
      asset_ids: assetIds,
      variations,
      include_volume: includeVolume,
      include_spread: includeSpread,
      message_header: header.trim() || null,
      message_footer: footer.trim() || null,
      recipient_ids: recipientIds,
      active: true
    };

    const result = initial
      ? await supa.from('scheduled_reports').update(payload).eq('id', initial.id)
      : await supa.from('scheduled_reports').insert(payload);

    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    router.push('/reports'); router.refresh();
  }

  // ativos selecionados na ordem do array
  const orderedSelected = assetIds.map((id) => assets.find((a) => a.id === id)).filter(Boolean) as Asset[];

  return (
    <Card className="shadow-lifted">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do relatório</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Resumo manhã" />
          </div>

          {/* Quando */}
          <div className="space-y-2">
            <Label htmlFor="cron"><Clock className="mr-1 inline h-3.5 w-3.5" />Quando enviar</Label>
            <Select
              id="cron"
              value={useCustomCron ? 'custom' : cron}
              onChange={(e) => {
                if (e.target.value === 'custom') setUseCustomCron(true);
                else { setUseCustomCron(false); setCron(e.target.value); }
              }}
            >
              {CRON_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              <option value="custom">Personalizar (cron expression)…</option>
            </Select>
            {useCustomCron && (
              <Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="ex: 0 11 * * 1-5" className="font-mono" required />
            )}
            <p className="text-xs text-zinc-500">
              Cron em UTC. Lembrete: 8h Brasília = 11h UTC. Formato: <code className="rounded bg-zinc-100 px-1 font-mono text-[10px]">minuto hora dia mês dia-semana</code>
            </p>
          </div>

          {/* Ativos */}
          <div className="space-y-2">
            <Label><Layers className="mr-1 inline h-3.5 w-3.5" />Ativos a incluir</Label>
            {orderedSelected.length > 0 && (
              <div className="space-y-1 rounded-lg border border-brand-200/60 bg-brand-50/30 p-2">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-brand-700">Selecionados (ordem da tabela)</p>
                {orderedSelected.map((a, idx) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-md bg-white p-2 text-xs shadow-soft">
                    <div className="flex items-center gap-2">
                      <Badge variant={categoryVariant(a.category)}>{categoryLabel(a.category)}</Badge>
                      <span className="font-mono text-zinc-500">{a.symbol}</span>
                      <span className="text-zinc-900">{a.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveAsset(idx, -1)} disabled={idx === 0} className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveAsset(idx, 1)} disabled={idx === orderedSelected.length - 1} className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => toggleAsset(a.id)} className="rounded px-1.5 py-0.5 text-rose-500 hover:bg-rose-50">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ativo (ICF, café, dólar...)" className="pl-9" />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-200">
              {filteredAssets.map((a) => {
                const sel = assetIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAsset(a.id)}
                    className={`flex w-full items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 text-left text-sm transition last:border-0 ${
                      sel ? 'bg-brand-50/50 text-brand-900' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" readOnly checked={sel} className="rounded text-brand-600" />
                      <Badge variant={categoryVariant(a.category)}>{categoryLabel(a.category)}</Badge>
                      <span className="font-mono text-xs text-zinc-500">{a.symbol}</span>
                      <span className="font-medium">{a.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400">{a.unit}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Variações */}
          <div className="space-y-2">
            <Label>Variações a mostrar</Label>
            <div className="flex flex-wrap gap-2">
              {VARIATION_OPTIONS.map((v) => {
                const active = variations.includes(v.value);
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => toggleVariation(v.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      active ? 'border-brand-400 bg-brand-50/40 text-brand-700 shadow-soft' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extras */}
          <div className="space-y-3">
            <Label>Incluir também</Label>
            <ToggleRow
              icon={<BarChart3 className="h-4 w-4" />}
              label="Volume do dia"
              hint="Mostra o volume financeiro do último pregão (só pra futures)"
              value={includeVolume}
              onChange={setIncludeVolume}
            />
            <ToggleRow
              icon={<Calendar className="h-4 w-4" />}
              label="Calendar spread M0↔M+1"
              hint="Indica contango ou backwardation (só pra futures)"
              value={includeSpread}
              onChange={setIncludeSpread}
            />
          </div>

          {/* Destinatários */}
          {recipients.length > 0 && (
            <div className="space-y-2">
              <Label><Users className="mr-1 inline h-3.5 w-3.5" />Quem recebe</Label>
              <RecipientPicker recipients={recipients} value={recipientIds} onChange={setRecipientIds} />
            </div>
          )}

          {/* Header/Footer */}
          <details className="rounded-lg border border-zinc-200 bg-zinc-50/30">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-700">Personalizar header e footer</summary>
            <div className="space-y-3 border-t border-zinc-200 p-4">
              <div className="space-y-2">
                <Label htmlFor="header">Header (linha de abertura)</Label>
                <Input id="header" value={header} onChange={(e) => setHeader(e.target.value)} placeholder="Padrão: 📊 Nome do relatório" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer">Footer</Label>
                <Input id="footer" value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Padrão: — MarketMan" />
              </div>
            </div>
          </details>

          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="brand" disabled={loading} size="lg">
              {loading ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar relatório'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} size="lg">Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ToggleRow({ icon, label, hint, value, onChange }: {
  icon: React.ReactNode; label: string; hint: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-brand-600">{icon}</span>
        <div>
          <div className="text-sm font-semibold text-zinc-900">{label}</div>
          <div className="text-xs text-zinc-500">{hint}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? 'bg-brand-500' : 'bg-zinc-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
