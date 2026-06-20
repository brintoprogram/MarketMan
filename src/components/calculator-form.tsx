'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge, categoryVariant, categoryLabel } from '@/components/ui/badge';
import { calculateOperation, getAlternateUnits, fmtBRL, fmtUSD } from '@/lib/conversions';
import { Calculator, Bell, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: string;
  unit: string | null;
  brapi_kind: string;
}

interface Props {
  assets: Asset[];
  latestByAsset: Record<string, { price: number; fetched_at: string }>;
  usdBrl: number | null;
  preselectedAssetId?: string;
}

export function CalculatorForm({ assets, latestByAsset, usdBrl, preselectedAssetId }: Props) {
  const [assetId, setAssetId] = useState(preselectedAssetId ?? assets[0]?.id ?? '');
  const asset = useMemo(() => assets.find((a) => a.id === assetId), [assets, assetId]);
  const latest = latestByAsset[assetId];

  const [useTargetPrice, setUseTargetPrice] = useState(false);
  const [targetPrice, setTargetPrice] = useState(latest ? String(latest.price) : '');
  const [quantity, setQuantity] = useState('100');

  const effectivePrice = useTargetPrice ? parseFloat(targetPrice) : latest?.price ?? 0;
  const qty = parseFloat(quantity);

  const result = useMemo(() => {
    if (!asset || !Number.isFinite(effectivePrice) || effectivePrice <= 0 || !Number.isFinite(qty)) {
      return null;
    }
    return calculateOperation({ asset, price: effectivePrice, quantity: qty, usdBrl });
  }, [asset, effectivePrice, qty, usdBrl]);

  const alternates = useMemo(() => {
    if (!asset || !Number.isFinite(effectivePrice) || effectivePrice <= 0) return [];
    return getAlternateUnits(asset, effectivePrice, usdBrl);
  }, [asset, effectivePrice, usdBrl]);

  // se mudou pra preço-alvo e preço-alvo > preço atual, mostra ganho potencial
  const deltaPct = useTargetPrice && latest && latest.price > 0
    ? ((effectivePrice - latest.price) / latest.price) * 100
    : null;

  return (
    <div className="space-y-6">
      <Card className="shadow-lifted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-brand-600" />
            Operação
          </CardTitle>
          <CardDescription>
            {usdBrl
              ? `Câmbio em uso: R$ ${usdBrl.toFixed(4)} / USD (cotação spot mais recente)`
              : 'Sem USD/BRL no banco — conversões podem ficar indisponíveis'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="asset">Ativo</Label>
            <Select id="asset" value={assetId} onChange={(e) => {
              setAssetId(e.target.value);
              const l = latestByAsset[e.target.value];
              if (l && useTargetPrice) setTargetPrice(String(l.price));
            }}>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.symbol})</option>
              ))}
            </Select>
            {asset && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant={categoryVariant(asset.category)}>{categoryLabel(asset.category)}</Badge>
                {asset.unit && <span className="font-mono text-xs text-zinc-500">{asset.unit}</span>}
                {latest && (
                  <span className="text-xs text-zinc-500">
                    Preço atual: <strong className="font-semibold text-zinc-900">{latest.price.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade ({result?.unitOfQuantity ?? '—'})</Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="text-lg font-semibold tabular-nums"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-4">
            <div>
              <Label htmlFor="target-toggle">Usar preço-alvo customizado</Label>
              <p className="mt-1 text-xs text-zinc-500">
                Desligado: usa o preço atual do mercado. Ligado: simula com um preço seu.
              </p>
            </div>
            <button
              id="target-toggle"
              type="button"
              onClick={() => {
                setUseTargetPrice(!useTargetPrice);
                if (!useTargetPrice && latest) setTargetPrice(String(latest.price));
              }}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${useTargetPrice ? 'bg-brand-500' : 'bg-zinc-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${useTargetPrice ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {useTargetPrice && (
            <div className="space-y-2">
              <Label htmlFor="target-price">Preço-alvo ({asset?.unit ?? '?'})</Label>
              <Input
                id="target-price"
                type="number"
                min={0}
                step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="text-lg font-semibold tabular-nums"
              />
              {deltaPct != null && Number.isFinite(deltaPct) && (
                <div className={`flex items-center gap-1.5 text-sm font-medium ${deltaPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {deltaPct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(2)}% vs preço atual
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado */}
      {result && (
        <Card className="overflow-hidden shadow-elevated">
          <div className="relative bg-gradient-brand p-6 text-white">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="relative">
              <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Valor total da operação</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                    {result.totalBRL != null ? fmtBRL(result.totalBRL) : '—'}
                  </div>
                  <div className="text-xs opacity-80">{qty.toLocaleString('pt-BR')} × {result.perUnit.brl != null ? fmtBRL(result.perUnit.brl, 4) : '—'} /{result.unitOfQuantity}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl opacity-90">
                    {result.totalUSD != null ? fmtUSD(result.totalUSD) : '—'}
                  </div>
                  <div className="text-xs opacity-80">{qty.toLocaleString('pt-BR')} × {result.perUnit.usd != null ? fmtUSD(result.perUnit.usd, 4) : '—'} /{result.unitOfQuantity}</div>
                </div>
              </div>
            </div>
          </div>

          {alternates.length > 0 && (
            <CardContent className="pt-6">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Preço unitário em outras unidades
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {alternates.map((alt) => (
                  <div key={alt.unit} className="flex items-baseline justify-between rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{alt.unit}</div>
                      <div className="mt-0.5 text-lg font-bold tabular-nums text-zinc-900">{alt.display}</div>
                    </div>
                    {alt.hint && <span className="text-[10px] text-zinc-400">{alt.hint}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          )}

          {asset && useTargetPrice && Number.isFinite(effectivePrice) && effectivePrice > 0 && (
            <CardContent className="border-t border-zinc-100 bg-zinc-50/30 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-zinc-900">Quer ser avisado quando atingir esse preço?</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Criamos um alerta de preço-alvo absoluto que dispara quando o preço
                    {(deltaPct ?? 0) >= 0 ? ' subir acima ' : ' cair abaixo '}
                    desse valor.
                  </p>
                </div>
                <Link href={`/alerts/new?asset=${asset.id}&target=${effectivePrice}&direction=${(deltaPct ?? 0) >= 0 ? 'above' : 'below'}`}>
                  <Button variant="brand">
                    <Bell className="h-4 w-4" />
                    Criar alerta no preço {effectivePrice.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
