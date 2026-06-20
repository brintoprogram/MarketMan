'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Badge, categoryVariant, categoryLabel } from '@/components/ui/badge';
import { Percent, Target, TrendingUp, TrendingDown, Repeat } from 'lucide-react';

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
  preselectedTarget?: string;
  preselectedTargetDirection?: 'above' | 'below' | 'crosses';
  initial?: {
    id: string;
    asset_id: string;
    alert_type: 'percentage' | 'price_target';
    threshold_pct: number;
    comparison_type: 'last_message' | 'days';
    comparison_days: number | null;
    target_price: number | null;
    target_direction: 'above' | 'below' | 'crosses' | null;
    message_template: string | null;
    active: boolean;
  };
}

export function AlertForm({
  assets, preselectedAssetId, preselectedThreshold,
  preselectedTarget, preselectedTargetDirection, initial
}: Props) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(initial?.asset_id ?? preselectedAssetId ?? assets[0]?.id ?? '');
  const [alertType, setAlertType] = useState<'percentage' | 'price_target'>(
    initial?.alert_type ?? (preselectedTarget ? 'price_target' : 'percentage')
  );
  const [threshold, setThreshold] = useState(String(initial?.threshold_pct ?? preselectedThreshold ?? 1));
  const [comparison, setComparison] = useState<'last_message' | '7d' | '30d' | 'custom'>(
    initial
      ? initial.comparison_type === 'last_message' ? 'last_message'
        : initial.comparison_days === 7 ? '7d'
          : initial.comparison_days === 30 ? '30d' : 'custom'
      : 'last_message'
  );
  const [customDays, setCustomDays] = useState(String(initial?.comparison_days ?? 14));
  const [targetPrice, setTargetPrice] = useState(String(initial?.target_price ?? preselectedTarget ?? ''));
  const [targetDirection, setTargetDirection] = useState<'above' | 'below' | 'crosses'>(
    initial?.target_direction ?? preselectedTargetDirection ?? 'above'
  );
  const [template, setTemplate] = useState(initial?.message_template ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAsset = useMemo(() => assets.find((a) => a.id === assetId), [assets, assetId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sessão expirada'); setLoading(false); return; }

    const payload: any = {
      user_id: user.id,
      asset_id: assetId,
      alert_type: alertType,
      message_template: template.trim() || null,
      active: true
    };

    if (alertType === 'percentage') {
      payload.threshold_pct = parseFloat(threshold);
      payload.comparison_type = comparison === 'last_message' ? 'last_message' : 'days';
      payload.comparison_days =
        comparison === 'last_message' ? null
          : comparison === '7d' ? 7
            : comparison === '30d' ? 30
              : parseInt(customDays, 10);
      payload.target_price = null;
      payload.target_direction = null;
    } else {
      payload.target_price = parseFloat(targetPrice);
      payload.target_direction = targetDirection;
      // mantém threshold_pct dummy pra não violar not-null se houver
      payload.threshold_pct = 1;
      payload.comparison_type = 'last_message';
      payload.comparison_days = null;
    }

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
          {/* Tipo de alerta */}
          <div>
            <Label>Tipo de alerta</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAlertType('percentage')}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                  alertType === 'percentage'
                    ? 'border-brand-400 bg-brand-50/40 shadow-soft ring-2 ring-brand-500/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                  <Percent className="h-3.5 w-3.5" />
                  Variação %
                </div>
                <span className="text-xs text-zinc-500">
                  Avisa a cada X% de variação a partir de uma referência.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAlertType('price_target')}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                  alertType === 'price_target'
                    ? 'border-brand-400 bg-brand-50/40 shadow-soft ring-2 ring-brand-500/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                  <Target className="h-3.5 w-3.5" />
                  Preço-alvo
                </div>
                <span className="text-xs text-zinc-500">
                  Avisa quando o preço passar de um valor absoluto seu.
                </span>
              </button>
            </div>
          </div>

          {/* Ativo */}
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

          {/* ========== PERCENTAGE ========== */}
          {alertType === 'percentage' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="threshold">Variação mínima para alertar</Label>
                <div className="relative">
                  <Input
                    id="threshold"
                    type="number" step="0.1" min="0.1" max="100"
                    value={threshold} onChange={(e) => setThreshold(e.target.value)}
                    required
                    className="pr-10 text-lg font-semibold tabular-nums"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">%</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-500">
                  Ex: <strong className="font-semibold text-zinc-700">1,5%</strong> = avisa quando o preço variar pelo menos 1,5%.
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
                    ? 'Dispara quando a variação atinge o limite desde o último aviso. Reseta o ponto de comparação a cada disparo.'
                    : 'Avalia a variação acumulada desde o período escolhido.'}
                </p>
              </div>

              {comparison === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="days">Quantos dias atrás?</Label>
                  <Input id="days" type="number" min="1" max="365" value={customDays} onChange={(e) => setCustomDays(e.target.value)} required />
                </div>
              )}
            </>
          )}

          {/* ========== PRICE TARGET ========== */}
          {alertType === 'price_target' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="target">Preço-alvo {selectedAsset?.unit && <span className="font-mono text-zinc-400">({selectedAsset.unit})</span>}</Label>
                <Input
                  id="target"
                  type="number" step="any" min="0"
                  value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)}
                  required
                  className="text-lg font-semibold tabular-nums"
                />
              </div>

              <div className="space-y-2">
                <Label>Disparar quando o preço…</Label>
                <div className="grid grid-cols-3 gap-2">
                  <DirectionButton
                    active={targetDirection === 'above'}
                    onClick={() => setTargetDirection('above')}
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Subir acima"
                    hint="Avisa só uma vez quando o preço atingir ou ultrapassar o alvo"
                  />
                  <DirectionButton
                    active={targetDirection === 'below'}
                    onClick={() => setTargetDirection('below')}
                    icon={<TrendingDown className="h-4 w-4" />}
                    label="Cair abaixo"
                    hint="Avisa só uma vez quando o preço cair pra baixo do alvo"
                  />
                  <DirectionButton
                    active={targetDirection === 'crosses'}
                    onClick={() => setTargetDirection('crosses')}
                    icon={<Repeat className="h-4 w-4" />}
                    label="Cruzar"
                    hint="Avisa toda vez que o preço cruzar o alvo (subindo ou descendo)"
                  />
                </div>
              </div>
            </>
          )}

          {/* Template msg */}
          <div className="space-y-2">
            <Label htmlFor="template">Mensagem personalizada (opcional)</Label>
            <textarea
              id="template"
              rows={3}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder={alertType === 'percentage'
                ? "Ex: Atenção! {asset} variou {pct} desde {ref_label}. Preço atual: {price}"
                : "Ex: {asset} {condition} do alvo {target}! Atual: {price}"}
              className="flex w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-inner-soft transition placeholder:text-zinc-400 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15"
            />
            <p className="text-xs leading-relaxed text-zinc-500">
              Variáveis:{' '}
              {alertType === 'percentage' ? (
                <>
                  <Code>{'{asset}'}</Code> <Code>{'{price}'}</Code> <Code>{'{pct}'}</Code>{' '}
                  <Code>{'{ref_price}'}</Code> <Code>{'{ref_label}'}</Code> <Code>{'{since_last_pct}'}</Code>
                </>
              ) : (
                <>
                  <Code>{'{asset}'}</Code> <Code>{'{symbol}'}</Code> <Code>{'{price}'}</Code>{' '}
                  <Code>{'{target}'}</Code> <Code>{'{condition}'}</Code>
                </>
              )}
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

function DirectionButton({ active, onClick, icon, label, hint }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
        active
          ? 'border-brand-400 bg-brand-50/40 shadow-soft ring-2 ring-brand-500/20'
          : 'border-zinc-200 bg-white hover:border-zinc-300'
      }`}
    >
      <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
        {icon}
        {label}
      </div>
    </button>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-zinc-100 px-1 font-mono text-[10px]">{children}</code>;
}
