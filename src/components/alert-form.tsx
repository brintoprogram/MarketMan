'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, categoryVariant, categoryLabel } from '@/components/ui/badge';
import { RecipientPicker, type RecipientOption } from '@/components/recipient-picker';
import { WhatsAppPreview, type PreviewAsset } from '@/components/whatsapp-preview';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toast';
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
  recipients?: RecipientOption[];
  /** Mapa assetId → { price, prevPrice (7d atrás) } pra alimentar o preview. */
  latestByAsset?: Record<string, { price: number; prevPrice?: number | null }>;
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
    max_per_day?: number | null;
    recipient_ids?: string[] | null;
    active: boolean;
  };
}

const PCT_VARS = [
  '{asset}', '{symbol}', '{price}', '{pct}',
  '{ref_price}', '{ref_label}', '{since_last_pct}', '{direction}', '{arrow}'
];
const TARGET_VARS = [
  '{asset}', '{symbol}', '{price}', '{target}', '{condition}', '{arrow}'
];

export function AlertForm({
  assets, recipients = [], latestByAsset = {},
  preselectedAssetId, preselectedThreshold, preselectedTarget, preselectedTargetDirection,
  initial
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
  const [maxPerDay, setMaxPerDay] = useState<string>(initial?.max_per_day != null ? String(initial.max_per_day) : '');
  const [recipientIds, setRecipientIds] = useState<string[]>(initial?.recipient_ids ?? []);
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedAsset = useMemo(() => assets.find((a) => a.id === assetId), [assets, assetId]);

  const previewAsset: PreviewAsset | null = useMemo(() => {
    if (!selectedAsset) return null;
    const latest = latestByAsset[selectedAsset.id];
    return {
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      unit: selectedAsset.unit,
      price: latest?.price ?? null,
      prevPrice: latest?.prevPrice ?? null
    };
  }, [selectedAsset, latestByAsset]);

  const firstRecipientName = useMemo(() => {
    if (recipientIds.length === 0) {
      const self = recipients.find((r) => r.is_self);
      return self?.name ?? null;
    }
    return recipients.find((r) => r.id === recipientIds[0])?.name ?? null;
  }, [recipientIds, recipients]);

  function insertVariable(v: string) {
    const el = textareaRef.current;
    if (!el) { setTemplate((t) => t + v); return; }
    const start = el.selectionStart ?? template.length;
    const end = el.selectionEnd ?? template.length;
    const next = template.slice(0, start) + v + template.slice(end);
    setTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + v.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Sessão expirada', 'Faça login de novo.');
      setLoading(false);
      return;
    }

    const payload: any = {
      user_id: user.id,
      asset_id: assetId,
      alert_type: alertType,
      message_template: template.trim() || null,
      max_per_day: maxPerDay.trim() ? parseInt(maxPerDay, 10) : null,
      recipient_ids: recipientIds,
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
      payload.threshold_pct = 1;
      payload.comparison_type = 'last_message';
      payload.comparison_days = null;
    }

    const result = initial
      ? await supabase.from('alerts').update(payload).eq('id', initial.id)
      : await supabase.from('alerts').insert(payload);

    setLoading(false);
    if (result.error) {
      toast.error('Não consegui salvar', result.error.message);
      return;
    }
    toast.success(initial ? 'Alerta atualizado' : 'Alerta criado', `${selectedAsset?.name ?? ''} ${alertType === 'percentage' ? `· ≥ ${threshold}%` : `· alvo ${targetPrice}`}`);
    router.push('/alerts');
    router.refresh();
  }

  const availableVars = alertType === 'percentage' ? PCT_VARS : TARGET_VARS;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* ============================ FORM ============================ */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo */}
            <div>
              <Label>Tipo de alerta</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <TypeButton
                  active={alertType === 'percentage'}
                  onClick={() => setAlertType('percentage')}
                  icon={<Percent className="h-3.5 w-3.5" />}
                  title="Variação %"
                  hint="Avisa a cada X% de variação a partir de uma referência."
                />
                <TypeButton
                  active={alertType === 'price_target'}
                  onClick={() => setAlertType('price_target')}
                  icon={<Target className="h-3.5 w-3.5" />}
                  title="Preço-alvo"
                  hint="Avisa quando o preço passar de um valor absoluto."
                />
              </div>
            </div>

            {/* Ativo */}
            <div className="space-y-1.5">
              <Label htmlFor="asset">Ativo</Label>
              <Select id="asset" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.symbol})</option>
                ))}
              </Select>
              {selectedAsset && (
                <div className="flex items-center gap-2 pt-0.5">
                  <Badge variant={categoryVariant(selectedAsset.category)}>{categoryLabel(selectedAsset.category)}</Badge>
                  {selectedAsset.unit && <span className="num text-[11px] text-ink-3">{selectedAsset.unit}</span>}
                  {previewAsset?.price != null && (
                    <span className="num text-[11px] text-ink-2">
                      atual {previewAsset.price.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ============ PERCENTAGE ============ */}
            {alertType === 'percentage' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="threshold">Variação mínima</Label>
                    <span className="num text-[11px] text-ink-3">0,1% – 20%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.1}
                      max={20}
                      step={0.1}
                      value={parseFloat(threshold) || 0}
                      onChange={(e) => setThreshold(e.target.value)}
                      className="flex-1 accent-[color:var(--brand)]"
                    />
                    <div className="relative w-28">
                      <Input
                        id="threshold"
                        type="number" step="0.1" min="0.1" max="100"
                        value={threshold} onChange={(e) => setThreshold(e.target.value)}
                        required
                        className="num pr-8 text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-ink-3">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Comparar com</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { v: 'last_message', label: 'Desde última msg' },
                      { v: '7d',           label: '7 dias atrás' },
                      { v: '30d',          label: '30 dias atrás' },
                      { v: 'custom',       label: 'Customizado…' }
                    ].map((opt) => (
                      <SegBtn
                        key={opt.v}
                        active={comparison === opt.v}
                        onClick={() => setComparison(opt.v as any)}
                      >
                        {opt.label}
                      </SegBtn>
                    ))}
                  </div>
                  {comparison === 'custom' && (
                    <div className="flex items-center gap-2 pt-1.5">
                      <Input
                        type="number" min="1" max="365"
                        value={customDays} onChange={(e) => setCustomDays(e.target.value)}
                        className="num w-28"
                      />
                      <span className="text-[12px] text-ink-2">dias atrás</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ============ PRICE TARGET ============ */}
            {alertType === 'price_target' && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="target">Preço-alvo</Label>
                    {selectedAsset?.unit && (
                      <span className="num text-[11px] text-ink-3">{selectedAsset.unit}</span>
                    )}
                  </div>
                  <Input
                    id="target"
                    type="number" step="any" min="0"
                    value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)}
                    required
                    className="num"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Disparar quando o preço…</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <DirBtn active={targetDirection === 'above'} onClick={() => setTargetDirection('above')} icon={<TrendingUp className="h-3.5 w-3.5" />}>Subir acima</DirBtn>
                    <DirBtn active={targetDirection === 'below'} onClick={() => setTargetDirection('below')} icon={<TrendingDown className="h-3.5 w-3.5" />}>Cair abaixo</DirBtn>
                    <DirBtn active={targetDirection === 'crosses'} onClick={() => setTargetDirection('crosses')} icon={<Repeat className="h-3.5 w-3.5" />}>Cruzar</DirBtn>
                  </div>
                </div>
              </>
            )}

            {/* Destinatários */}
            {recipients.length > 1 && (
              <RecipientPicker recipients={recipients} value={recipientIds} onChange={setRecipientIds} />
            )}

            {/* Template + chips */}
            <div className="space-y-1.5">
              <Label htmlFor="template">Mensagem (template)</Label>
              {/* chips clicáveis */}
              <div className="flex flex-wrap gap-1">
                {availableVars.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="num inline-flex h-[24px] items-center rounded border border-line bg-panel-2 px-1.5 text-[10px] font-medium text-ink-2 transition hover:border-brand hover:bg-brand-soft hover:text-brand-ink"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                id="template"
                ref={textareaRef}
                rows={5}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder={alertType === 'percentage'
                  ? 'Deixe vazio pra usar o template padrão. Ou crie o seu: ex {asset} {direction} {pct} desde {ref_label}'
                  : 'Deixe vazio pra usar o padrão. Ex: {asset} {condition} do alvo {target}'}
                className="block w-full rounded-md border border-line-strong bg-panel px-3 py-2 text-[13px] leading-relaxed text-ink shadow-[inset_0_1px_0_rgba(0,0,0,.02)] placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
              <p className="text-[11px] text-ink-3">
                Toque numa variável pra inserir. Use *<span className="font-semibold">negrito</span>* e _<span className="italic">itálico</span>_ no estilo do WhatsApp.
              </p>
            </div>

            {/* Limites */}
            <div className="space-y-1.5">
              <Label htmlFor="max-per-day">Máx. avisos por dia (opcional)</Label>
              <Input
                id="max-per-day"
                type="number" min="1" max="50"
                value={maxPerDay}
                onChange={(e) => setMaxPerDay(e.target.value)}
                placeholder="ilimitado se vazio"
                className="num"
              />
            </div>

            <div className="flex gap-2 border-t border-line pt-4">
              <Button type="submit" variant="brand" disabled={loading}>
                {loading ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar alerta'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ============================ PREVIEW ============================ */}
      <div className="space-y-3 lg:sticky lg:top-[76px] lg:self-start">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
          Prévia no WhatsApp
        </div>
        <WhatsAppPreview
          asset={previewAsset}
          alertType={alertType}
          threshold={parseFloat(threshold) || 0}
          comparison={comparison}
          customDays={parseInt(customDays, 10) || 14}
          targetPrice={parseFloat(targetPrice) || 0}
          targetDirection={targetDirection}
          template={template}
          recipientName={firstRecipientName}
        />
        <p className="text-[11px] leading-relaxed text-ink-3">
          A prévia atualiza em tempo real conforme você edita. Valores reais do ativo selecionado são usados como referência.
        </p>
      </div>
    </div>
  );
}

function TypeButton({ active, onClick, icon, title, hint }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2.5 text-left transition ${
        active ? 'border-brand bg-brand-soft' : 'border-line bg-panel hover:border-line-strong hover:bg-panel-2'
      }`}
    >
      <div className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${active ? 'text-brand-ink' : 'text-ink'}`}>
        {icon}{title}
      </div>
      <span className="text-[11px] leading-snug text-ink-2">{hint}</span>
    </button>
  );
}

function DirBtn({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-[12px] font-semibold transition ${
        active ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-panel text-ink-2 hover:border-line-strong hover:bg-panel-2'
      }`}
    >
      {icon}{children}
    </button>
  );
}

function SegBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition ${
        active ? 'border-ink bg-ink text-bg' : 'border-line bg-panel text-ink-2 hover:border-line-strong hover:bg-panel-2'
      }`}
    >
      {children}
    </button>
  );
}
