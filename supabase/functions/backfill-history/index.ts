// backfill-history — busca histórico de 5 anos na brapi.dev e preenche a tabela quotes.
// Dispare via POST no painel do Supabase ou com: supabase functions invoke backfill-history
// Aceita body opcional: { "asset_id": "<uuid>" } para rodar só um ativo.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BRAPI_TOKEN   = Deno.env.get('token_brapi') ?? '';
const BRAPI_BASE    = 'https://brapi.dev/api';
const RANGE         = '5y';
const INTERVAL      = '1d';

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function buildHistoryUrl(kind: string, symbol: string): string {
  if (kind === 'moedas') {
    const u = new URL(`${BRAPI_BASE}/v2/currency`);
    u.searchParams.set('currency', symbol);
    u.searchParams.set('range', RANGE);
    u.searchParams.set('interval', INTERVAL);
    return u.toString();
  }
  // 'quote' e 'crypto'
  return `${BRAPI_BASE}/quote/${symbol}?range=${RANGE}&interval=${INTERVAL}`;
}

interface HistPoint { date: number; price: number; }

function extractHistorical(kind: string, parsed: unknown): HistPoint[] {
  if (kind === 'moedas') {
    const currency = (parsed as any)?.currency?.[0];
    return ((currency?.historicalDataPrice ?? []) as any[])
      .filter((p) => p.close != null && p.date != null)
      .map((p) => ({ date: Number(p.date), price: parseFloat(p.close) }));
  }
  const result = (parsed as any)?.results?.[0];
  return ((result?.historicalDataPrice ?? []) as any[])
    .filter((p) => p.close != null && p.date != null)
    .map((p) => ({ date: Number(p.date), price: Number(p.close) }));
}

async function backfillAsset(asset: {
  id: string; symbol: string; brapi_kind: string; brapi_symbol: string;
}): Promise<Record<string, unknown>> {
  if (asset.brapi_kind === 'futures') {
    return { symbol: asset.symbol, skipped: true, reason: 'futures — histórico diário não suportado' };
  }

  const url = buildHistoryUrl(asset.brapi_kind, asset.brapi_symbol);
  let parsed: unknown;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${BRAPI_TOKEN}` } });
    if (!res.ok) return { symbol: asset.symbol, ok: false, error: `brapi ${res.status}` };
    parsed = await res.json();
  } catch (e) {
    return { symbol: asset.symbol, ok: false, error: (e as Error).message };
  }

  const historical = extractHistorical(asset.brapi_kind, parsed);
  if (!historical.length) {
    return { symbol: asset.symbol, ok: false, error: 'sem historicalDataPrice na resposta' };
  }

  // Descobre datas que já existem no banco (source = brapi_backfill) para não duplicar
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const { data: existing } = await supa
    .from('quotes')
    .select('fetched_at')
    .eq('asset_id', asset.id)
    .eq('source', 'brapi_backfill')
    .gte('fetched_at', fiveYearsAgo.toISOString());

  const existingDays = new Set(
    (existing ?? []).map((q: any) => new Date(q.fetched_at).toISOString().slice(0, 10))
  );

  const toInsert = historical
    .filter((p) => {
      const day = new Date(p.date * 1000).toISOString().slice(0, 10);
      return !existingDays.has(day);
    })
    .map((p) => ({
      asset_id:   asset.id,
      price:      p.price,
      fetched_at: new Date(p.date * 1000).toISOString(),
      raw:        { date: p.date, close: p.price },
      source:     'brapi_backfill',
    }));

  if (!toInsert.length) {
    return { symbol: asset.symbol, ok: true, inserted: 0, note: 'já atualizado' };
  }

  // Insere em lotes de 500
  let inserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await supa.from('quotes').insert(toInsert.slice(i, i + 500));
    if (error) errors.push(error.message);
    else inserted += Math.min(500, toInsert.length - i);
  }

  return {
    symbol: asset.symbol,
    ok: errors.length === 0,
    inserted,
    total_available: historical.length,
    ...(errors.length ? { errors } : {}),
  };
}

Deno.serve(async (req) => {
  if (!BRAPI_TOKEN) {
    return new Response(JSON.stringify({ error: 'token_brapi não configurado' }), { status: 400 });
  }

  let onlyAssetId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    onlyAssetId = body?.asset_id ?? null;
  } catch { /* */ }

  let query = supa.from('assets').select('id, symbol, brapi_kind, brapi_symbol').eq('active', true);
  if (onlyAssetId) query = (query as any).eq('id', onlyAssetId);

  const { data: assets, error: assetsErr } = await query;
  if (assetsErr || !assets) {
    return new Response(JSON.stringify({ error: assetsErr?.message ?? 'no assets' }), { status: 500 });
  }

  const results: Record<string, unknown>[] = [];
  for (const asset of assets) {
    results.push(await backfillAsset(asset));
  }

  const totalInserted = results.reduce((s, r) => s + (Number((r as any).inserted) || 0), 0);

  return new Response(
    JSON.stringify({ ok: true, total_inserted: totalInserted, assets: results }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
