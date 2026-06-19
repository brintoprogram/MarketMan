// Cron: rodar a cada 15 minutos.
// Busca cotações de todos assets ativos via brapi.dev, insere em `quotes`,
// e dispara `process-alerts` no final.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { BrapiClient, type BrapiKind } from '../_shared/brapi.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BRAPI_TOKEN = Deno.env.get('token_brapi') ?? '';

Deno.serve(async () => {
  const startedAt = Date.now();
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  if (!BRAPI_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'token_brapi não configurado' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data: assets, error: assetsErr } = await supa
    .from('assets')
    .select('id, symbol, brapi_kind, brapi_symbol')
    .eq('active', true);

  if (assetsErr || !assets) {
    return new Response(JSON.stringify({ error: assetsErr?.message ?? 'no assets' }), { status: 500 });
  }

  const brapi = new BrapiClient(BRAPI_TOKEN);
  const results: Array<{ symbol: string; ok: boolean; price?: number; error?: string }> = [];

  for (const asset of assets) {
    const fetched = await brapi.fetchPrice(asset.brapi_kind as BrapiKind, asset.brapi_symbol);
    if (!fetched) {
      results.push({ symbol: asset.symbol, ok: false, error: 'no data' });
      continue;
    }
    const { error: insErr } = await supa
      .from('quotes')
      .insert({ asset_id: asset.id, price: fetched.price, raw: fetched.raw });
    results.push({
      symbol: asset.symbol,
      ok: !insErr,
      price: fetched.price,
      error: insErr?.message
    });
  }

  // dispara process-alerts (não-bloqueante)
  const processUrl = `${SUPABASE_URL}/functions/v1/process-alerts`;
  fetch(processUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'fetch-quotes' })
  }).catch((e) => console.error('process-alerts dispatch:', e));

  return new Response(
    JSON.stringify({
      ok: true,
      duration_ms: Date.now() - startedAt,
      assets: results.length,
      success: results.filter((r) => r.ok).length,
      results
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
