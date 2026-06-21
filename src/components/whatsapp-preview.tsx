'use client';

// Preview de mensagem WhatsApp em tempo real.
// Interpola as variáveis do template com dados reais do ativo selecionado.

import { useMemo } from 'react';
import { CheckCheck, Briefcase } from 'lucide-react';

export interface PreviewAsset {
  symbol: string;
  name: string;
  unit: string | null;
  price: number | null;       // último preço coletado (real)
  prevPrice?: number | null;  // preço 7d atrás (real) — pra simular variação
}

interface Props {
  asset: PreviewAsset | null;
  alertType: 'percentage' | 'price_target';
  threshold?: number;                              // % no percentage
  comparison?: 'last_message' | '7d' | '30d' | 'custom';
  customDays?: number;
  targetPrice?: number;
  targetDirection?: 'above' | 'below' | 'crosses';
  template: string;                                // template do user (pode estar vazio)
  recipientName?: string | null;                   // pra mostrar "Pra: X" no rodapé
}

const DEFAULT_PCT_TEMPLATE = [
  '{arrow} *{asset}* {direction} *{pct}*',
  '',
  'Preço atual: *{price}*',
  'Referência ({ref_label}): {ref_price}',
  '',
  '— MarketMan'
].join('\n');

const DEFAULT_TARGET_TEMPLATE = [
  '{arrow} *{asset}* {condition} do alvo *{target}*',
  '',
  'Preço atual: *{price}*',
  '',
  '— MarketMan'
].join('\n');

function fmtPrice(value: number | null | undefined, unit?: string | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const usd = unit?.includes('USD');
  return value.toLocaleString(usd ? 'en-US' : 'pt-BR', {
    style: 'currency', currency: usd ? 'USD' : 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 4
  });
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// renderiza markdown estilo WhatsApp simples: *bold*, _italic_
function renderWhatsAppMd(text: string): React.ReactNode {
  // split por tokens preservando *...* e _..._
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={i} className="font-semibold">{part.slice(1, -1)}</strong>;
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function WhatsAppPreview({
  asset, alertType, threshold, comparison, customDays,
  targetPrice, targetDirection, template, recipientName
}: Props) {
  const rendered = useMemo(() => {
    const safePrice = asset?.price ?? null;
    const safePrev  = asset?.prevPrice ?? null;
    const unit = asset?.unit ?? null;

    // calcula valores derivados
    let pct: number | null = null;
    let refPrice: number | null = null;
    let refLabel = '';
    let direction = 'subiu';
    let arrow = '🟢';
    let target = targetPrice ?? null;
    let condition = '';

    if (alertType === 'percentage') {
      const t = threshold ?? 0;
      // simula uma variação que ATINGIU o threshold (positiva por padrão)
      pct = t > 0 ? t : 1;
      if (safePrice != null) refPrice = safePrice / (1 + pct / 100);
      refLabel =
        comparison === 'last_message' ? 'a última mensagem'
        : comparison === '7d' ? '7 dias atrás'
        : comparison === '30d' ? '30 dias atrás'
        : `${customDays ?? 14} dias atrás`;
      direction = pct >= 0 ? 'subiu' : 'caiu';
      arrow = pct >= 0 ? '🟢' : '🔴';
    } else {
      target = targetPrice ?? safePrice ?? 0;
      direction = targetDirection === 'above' ? 'subiu acima'
                : targetDirection === 'below' ? 'caiu abaixo'
                : 'cruzou';
      condition = direction;
      arrow = targetDirection === 'above' ? '🟢'
            : targetDirection === 'below' ? '🔴'
            : '🟡';
    }

    const variables: Record<string, string> = {
      '{asset}': asset?.name ?? 'Café Arábica (B3)',
      '{symbol}': asset?.symbol ?? 'ICF',
      '{price}': fmtPrice(safePrice, unit),
      '{ref_price}': fmtPrice(refPrice, unit),
      '{pct}': fmtPct(pct),
      '{ref_label}': refLabel,
      '{since_last_pct}': fmtPct(pct),
      '{direction}': direction,
      '{arrow}': arrow,
      '{target}': fmtPrice(target, unit),
      '{condition}': condition
    };

    const defaultTpl = alertType === 'percentage' ? DEFAULT_PCT_TEMPLATE : DEFAULT_TARGET_TEMPLATE;
    const tpl = template.trim() || defaultTpl;

    let out = tpl;
    for (const [k, v] of Object.entries(variables)) out = out.replaceAll(k, v);
    return out;
  }, [asset, alertType, threshold, comparison, customDays, targetPrice, targetDirection, template]);

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-card">
      {/* Header do chat */}
      <div className="flex items-center gap-2.5 border-b border-line bg-[#075E54] px-3 py-2.5 text-white dark:bg-[#1F2C34]">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white ring-1 ring-inset ring-white/20">
          <Briefcase className="h-3.5 w-3.5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-tight">MarketMan</div>
          <div className="text-[10px] leading-tight opacity-80">
            {recipientName ? `pra ${recipientName}` : 'online'}
          </div>
        </div>
        <div className="num text-[10px] opacity-80">prévia</div>
      </div>

      {/* Área de mensagens — creme no light, deep teal no dark */}
      <div className="relative min-h-[280px] bg-[#ECE5DD] px-3 py-4 dark:bg-[#0B141A]">
        {/* Padrão sutil */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.4) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
          aria-hidden
        />

        {/* Balão de mensagem (outgoing) */}
        <div className="relative flex justify-end">
          <div className="relative max-w-[88%] rounded-md rounded-tr-sm bg-[#DCF8C6] px-3 py-2 shadow-sm dark:bg-[#005C4B]">
            <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-snug text-[#111B21] dark:text-[#E9EDEF]">
              {renderWhatsAppMd(rendered)}
            </pre>
            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#667781] dark:text-[#8696A0]">
              <span className="num">{hh}:{mm}</span>
              <CheckCheck className="h-3 w-3 text-[#53BDEB]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
