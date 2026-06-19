'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

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

export function AlertForm({ assets, preselectedAssetId, initial }: Props) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(initial?.asset_id ?? preselectedAssetId ?? assets[0]?.id ?? '');
  const [threshold, setThreshold] = useState(String(initial?.threshold_pct ?? 1));
  const [comparison, setComparison] = useState<'last_message' | '7d' | '30d' | 'custom'>(
    initial
      ? initial.comparison_type === 'last_message'
        ? 'last_message'
        : initial.comparison_days === 7
          ? '7d'
          : initial.comparison_days === 30
            ? '30d'
            : 'custom'
      : 'last_message'
  );
  const [customDays, setCustomDays] = useState(String(initial?.comparison_days ?? 14));
  const [template, setTemplate] = useState(initial?.message_template ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Sessão expirada');
      setLoading(false);
      return;
    }

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
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.push('/alerts');
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="asset">Ativo</Label>
            <Select id="asset" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.symbol})
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Variação mínima para alertar (%)</Label>
            <Input
              id="threshold"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              required
            />
            <p className="text-xs text-zinc-500">
              Ex: 1.5 = só te avisamos quando o preço subir ou cair pelo menos 1,5%.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comparison">Comparar com</Label>
            <Select
              id="comparison"
              value={comparison}
              onChange={(e) => setComparison(e.target.value as typeof comparison)}
            >
              <option value="last_message">Preço da última mensagem enviada</option>
              <option value="7d">7 dias atrás</option>
              <option value="30d">30 dias atrás</option>
              <option value="custom">Período customizado…</option>
            </Select>
            <p className="text-xs text-zinc-500">
              {comparison === 'last_message'
                ? 'O alerta dispara sempre que a variação for ≥ o limite desde o último aviso. Cada alerta "reseta" o ponto de comparação.'
                : 'O alerta avalia a variação acumulada desde o período escolhido. Pode disparar várias vezes se continuar variando.'}
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
              className="flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
            <p className="text-xs text-zinc-500">
              Variáveis disponíveis: <code>{'{asset}'}</code>, <code>{'{price}'}</code>, <code>{'{pct}'}</code>, <code>{'{ref_price}'}</code>, <code>{'{ref_label}'}</code>, <code>{'{since_last_pct}'}</code>.
              Se vazio, usamos o template padrão.
            </p>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" variant="brand" disabled={loading}>
              {loading ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar alerta'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
