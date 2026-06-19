// Avalia todos os alertas ativos contra a cotação mais recente,
// dispara mensagens Z-API quando o threshold é ultrapassado,
// e registra em `alert_history`.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ZapiClient } from '../_shared/zapi.ts';
import { fmtPrice, fmtPct, arrow } from '../_shared/format.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ZAPI_INSTANCE_ID = Deno.env.get('zapi_instance_id') ?? '';
const ZAPI_INSTANCE_TOKEN = Deno.env.get('zapi_instance_token') ?? '';
const ZAPI_CLIENT_TOKEN = Deno.env.get('zapi_client_token') ?? '';

Deno.serve(async () => {
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const zapiReady = !!(ZAPI_INSTANCE_ID && ZAPI_INSTANCE_TOKEN && ZAPI_CLIENT_TOKEN);
  const zapi = zapiReady
    ? new ZapiClient({
        instanceId: ZAPI_INSTANCE_ID,
        instanceToken: ZAPI_INSTANCE_TOKEN,
        clientToken: ZAPI_CLIENT_TOKEN
      })
    : null;

  // pega alertas ativos + perfil verificado + asset
  const { data: alerts, error } = await supa
    .from('alerts')
    .select(`
      id, user_id, asset_id, threshold_pct, comparison_type, comparison_days,
      message_template, reference_price, reference_at, last_notified_at,
      profile:profiles!alerts_user_id_fkey(whatsapp_phone, whatsapp_verified, full_name),
      asset:assets(id, symbol, name, unit)
    `)
    .eq('active', true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const triggered: any[] = [];
  const skipped: any[] = [];

  for (const a of alerts ?? []) {
    const profile = (a as any).profile;
    const asset = (a as any).asset;
    if (!profile?.whatsapp_verified || !profile.whatsapp_phone) {
      skipped.push({ alert: a.id, reason: 'whatsapp_not_verified' });
      continue;
    }

    // última cotação do ativo
    const { data: latestQuote } = await supa
      .from('quotes')
      .select('price, fetched_at')
      .eq('asset_id', a.asset_id)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestQuote) {
      skipped.push({ alert: a.id, reason: 'no_latest_quote' });
      continue;
    }
    const priceNow = Number(latestQuote.price);

    // preço de referência conforme comparison_type
    let refPrice: number | null = null;
    let refLabel = '';
    let refAt: string | null = null;

    if (a.comparison_type === 'last_message') {
      // se nunca teve referência: zera com a cotação atual e não dispara
      if (a.reference_price == null) {
        await supa
          .from('alerts')
          .update({ reference_price: priceNow, reference_at: latestQuote.fetched_at })
          .eq('id', a.id);
        skipped.push({ alert: a.id, reason: 'reference_initialized' });
        continue;
      }
      refPrice = Number(a.reference_price);
      refAt = a.reference_at;
      refLabel = a.last_notified_at ? 'a última mensagem' : 'o início do monitoramento';
    } else if (a.comparison_type === 'days' && a.comparison_days) {
      const since = new Date(Date.now() - a.comparison_days * 24 * 3600 * 1000).toISOString();
      const { data: oldQuote } = await supa
        .from('quotes')
        .select('price, fetched_at')
        .eq('asset_id', a.asset_id)
        .gte('fetched_at', since)
        .order('fetched_at', { ascending: true })
        .limit(1)
        .single();
      if (!oldQuote) {
        skipped.push({ alert: a.id, reason: 'no_historical_quote' });
        continue;
      }
      refPrice = Number(oldQuote.price);
      refAt = oldQuote.fetched_at;
      refLabel = `${a.comparison_days} dia${a.comparison_days === 1 ? '' : 's'} atrás`;
    }

    if (refPrice == null || refPrice === 0) {
      skipped.push({ alert: a.id, reason: 'invalid_reference' });
      continue;
    }

    const pctChange = ((priceNow - refPrice) / refPrice) * 100;

    if (Math.abs(pctChange) < Number(a.threshold_pct)) {
      skipped.push({ alert: a.id, reason: 'below_threshold', pctChange: pctChange.toFixed(3) });
      continue;
    }

    // calcula variação desde a última mensagem (independente da estratégia)
    let sinceLastPct = pctChange;
    if (a.last_notified_at) {
      const { data: lastHist } = await supa
        .from('alert_history')
        .select('price_now')
        .eq('alert_id', a.id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();
      if (lastHist && Number(lastHist.price_now) !== 0) {
        sinceLastPct = ((priceNow - Number(lastHist.price_now)) / Number(lastHist.price_now)) * 100;
      }
    }

    const message = renderMessage({
      template: a.message_template,
      asset,
      priceNow,
      refPrice,
      pctChange,
      refLabel,
      sinceLastPct
    });

    let zapiResp: any = null;
    let zapiMessageId: string | null = null;
    let status: 'sent' | 'failed' | 'queued' = 'queued';

    if (zapi) {
      try {
        zapiResp = await zapi.sendText(profile.whatsapp_phone, message);
        zapiMessageId = zapiResp?.messageId ?? zapiResp?.id ?? null;
        status = 'sent';
      } catch (e) {
        zapiResp = { error: (e as Error).message };
        status = 'failed';
      }
    }

    await supa.from('alert_history').insert({
      alert_id: a.id,
      user_id: a.user_id,
      asset_id: a.asset_id,
      price_now: priceNow,
      price_reference: refPrice,
      pct_change: pctChange,
      message,
      whatsapp_phone: profile.whatsapp_phone,
      zapi_message_id: zapiMessageId,
      zapi_response: zapiResp,
      status
    });

    if (status === 'sent') {
      const updates: any = { last_notified_at: new Date().toISOString() };
      if (a.comparison_type === 'last_message') {
        updates.reference_price = priceNow;
        updates.reference_at = latestQuote.fetched_at;
      }
      await supa.from('alerts').update(updates).eq('id', a.id);
    }

    triggered.push({ alert: a.id, pctChange: pctChange.toFixed(3), status });
  }

  return new Response(
    JSON.stringify({ ok: true, triggered: triggered.length, skipped: skipped.length, triggered_detail: triggered, skipped_detail: skipped }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

interface RenderArgs {
  template: string | null;
  asset: { name: string; symbol: string; unit: string | null };
  priceNow: number;
  refPrice: number;
  pctChange: number;
  refLabel: string;
  sinceLastPct: number;
}

function renderMessage(args: RenderArgs): string {
  const { template, asset, priceNow, refPrice, pctChange, refLabel, sinceLastPct } = args;
  const direction = pctChange > 0 ? 'subiu' : 'caiu';
  const variables: Record<string, string> = {
    '{asset}': asset.name,
    '{symbol}': asset.symbol,
    '{price}': fmtPrice(priceNow, asset.unit),
    '{ref_price}': fmtPrice(refPrice, asset.unit),
    '{pct}': fmtPct(pctChange),
    '{ref_label}': refLabel,
    '{since_last_pct}': fmtPct(sinceLastPct),
    '{direction}': direction
  };

  if (template) {
    let out = template;
    for (const [k, v] of Object.entries(variables)) out = out.replaceAll(k, v);
    return out;
  }

  // template padrão
  const lines = [
    `${arrow(pctChange)} *${asset.name}* ${direction} *${fmtPct(pctChange)}*`,
    ``,
    `Preço atual: *${fmtPrice(priceNow, asset.unit)}*`,
    `Referência (${refLabel}): ${fmtPrice(refPrice, asset.unit)}`
  ];
  if (Math.abs(sinceLastPct - pctChange) > 0.01) {
    lines.push(`Desde a última mensagem: *${fmtPct(sinceLastPct)}*`);
  }
  lines.push(``, `— MarketMan`);
  return lines.join('\n');
}
