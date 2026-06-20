'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Badge, categoryVariant, categoryLabel } from '@/components/ui/badge';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: string;
  unit: string | null;
}

interface Props {
  assets: Asset[];
  preselectedAssetId?: string;
  preselectedThreshold?: string;
  initial?: {
    id: string;
    asset_id: string;
    threshold_pct: number;
    comparison_type: 'last_message' | 'days';
    comparison_days: number | null;
    message_template: string | null;
    active: boolean;
  };
}

export function AlertForm({ assets, preselectedAssetId, preselectedThreshold, initial }: Props) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(initial?.asset_id ?? preselectedAssetId ?? assets[0]?.id ?? '');
  const [threshold, setThreshold] = useState(String(initial?.threshold_pct ?? preselectedThreshold ?? 1));
  const [comparison, setComparison] = useState<'last_message' | '7d' | '30d' | 'custom'>(
    initial
      ? initial.comparison_type === 'last_message'
        ? 'last_message'
        : initial.comparison_days === 7 ? '7d' : initial.comparison_days === 30 ? '30d' : 'custom'
      : 'last_message'
  );
  const [customDays, setCustomDays] = useState(String(initial?.comparison_days ?? 14));
  const [template, setTemplate] = useState(initial?.message_template ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAsset = assets.find((a) => a.id === assetId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sessão expirada'); setLoading(false); return; }

    const payload = {
      user_id: user.id,
      asset_id: assetId,
      threshold_pct: parseFloat(threshold),
      comparison_type: comparison === 'last_message' ? 'last_message' : 'days',
      comparison_days:
        comparison === 'last_message' ? null :
        comparison === '7d' ? 7 :
        comparison === '30d' ? 30 :
        parseInt(customDays, 10),
      message_template: template.trim() || null,
      active: true
    };

    const result = initial
      ? await supabase.from('alerts').update(payload).eq('id', initial.id)
      : await supabase.from('alerts').insert(payload);

    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    router.push('/alerts'); router.refresh();
  }

  return (
    <Card className="shadow-lifted">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="asset">Ativo</Label>
            <Select id="asset" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.symbol})</option>
              ))}
            </Select>
            {selectedAsset && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant={categoryVariant(selectedAsset.category)}>{categoryLabel(selectedAsset.category)}</Badge>
                {selectedAsset.unit && <span className="font-mono text-xs text-zinc-500">{selectedAsset.unit}</span>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Variação mínima para alertar</Label>
            <div className="relative">
              <Input
                id="threshold"
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
                className="pr-10 text-lg font-semibold tabular-nums"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">%</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              Ex: <strong className="font-semibold text-zinc-700">1,5%</strong> = só te avisamos quando o preço subir ou cair pelo menos 1,5%.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comparison">Comparar com</Label>
            <Select id="comparison" value={comparison} onChange={(e) => setComparison(e.target.value as typeof comparison)}>
              <option value="last_message">Preço da última mensagem enviada</option>
              <option value="7d">7 dias atrás</option>
              <option value="30d">30 dias atrás</option>
              <option value="custom">Período customizado…</option>
            </Select>
            <p className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 text-xs leading-relaxed text-zinc-600">
              {comparison === 'last_message'
                ? 'Dispara sempre que a variação atinge o limite desde o último aviso. O ponto de comparação "reseta" a cada disparo — bom pra alertas incrementais.'
                : 'Avalia a variação acumulada desde o período escolhido. Pode disparar repetidamente se a variação continuar crescendo.'}
            </p>
          </div>

          {comparison === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="days">Quantos dias atrás?</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="template">Mensagem personalizada (opcional)</Label>
            <textarea
              id="template"
              rows={3}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Ex: Atenção! {asset} variou {pct} desde {ref_label}. Preço atual: {price}"
              className="flex w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-inner-soft transition placeholder:text-zinc-400 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15"
            />
            <p className="text-xs leading-relaxed text-zinc-500">
              Variáveis: <code className="rounded bg-zinc-100 px-1 font-mono text-[10px]">{'{asset}'}</code>,{' '}
              <code className="rounded bg-zinc-100 px-1 font-mono text-[10px]">{'{price}'}</code>,{' '}
              <code className="rounded bg-zinc-100 px-1 font-mono text-[10px]">{'{pct}'}</code>,{' '}
              <code className="rounded bg-zinc-100 px-1 font-mono text-[10px]">{'{ref_price}'}</code>,{' '}
              <code className="rounded bg-zinc-100 px-1 font-mono text-[10px]">{'{ref_label}'}</code>,{' '}
              <code className="rounded bg-zinc-100 px-1 font-mono text-[10px]">{'{since_last_pct}'}</code>.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="brand" disabled={loading} size="lg">
              {loading ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar alerta'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} size="lg">Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
