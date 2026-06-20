// fetch-quotes v7 — usa cache em public.futures_contracts pra resolver front-month.
// Sem chamadas extras à brapi pra resolver contrato (só 1 quote por ativo).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BRAPI_TOKEN = Deno.env.get('token_brapi') ?? '';
const BRAPI_BASE = 'https://brapi.dev/api';
const SOURCE = 'fetch-quotes';

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function log(level: 'debug'|'info'|'warn'|'error', event: string, fields: Record<string, unknown> = {}) {
  try { await supa.from('system_logs').insert({ level, source: SOURCE, event, ...fields }); }
  catch (e) { console.error('log failed:', e); }
}

async function consumeRateLimit() {
  const { data, error } = await supa.rpc('try_consume_rate_limit');
  if (error) return { allowed: true, current_count: 0, max_count: 1000, enabled: false };
  return data?.[0] ?? { allowed: true, current_count: 0, max_count: 1000, enabled: false };
}

type BrapiKind = 'quote' | 'futures' | 'moedas' | 'crypto';
const frontMonthCache = new Map<string, string>();

async function resolveFrontMonthFromDb(root: string, assetId: string): Promise<string | null> {
  if (frontMonthCache.has(root)) return frontMonthCache.get(root)!;

  const { data, error } = await supa.rpc('get_front_month_contract', { p_root: root });
  if (error) {
    await log('error', 'front_month_db_failed', { asset_id: assetId, error_message: error.message, metadata: { root } });
    return null;
  }
  const symbol = typeof data === 'string' ? data : null;
  if (!symbol) {
    const { data: sample } = await supa.from('futures_contracts').select('underlying_asset').limit(50);
    const underlyings = Array.from(new Set((sample ?? []).map((r: any) => r.underlying_asset))).sort();
    await log('warn', 'front_month_not_in_cache', {
      asset_id: assetId,
      metadata: { root, sample_underlyings_in_cache: underlyings.slice(0, 30) }
    });
    return null;
  }
  frontMonthCache.set(root, symbol);
  await log('info', 'front_month_resolved', { asset_id: assetId, metadata: { root, chosen: symbol, source: 'db_cache' } });
  return symbol;
}

function buildBrapiUrl(kind: BrapiKind, symbol: string): string {
  if (kind === 'futures') {
    const u = new URL(`${BRAPI_BASE}/v2/futures/quote`);
    u.searchParams.set('symbols', symbol);
    return u.toString();
  }
  if (kind === 'moedas') {
    const u = new URL(`${BRAPI_BASE}/v2/currency`);
    u.searchParams.set('currency', symbol);
    return u.toString();
  }
  return `${BRAPI_BASE}/quote/${symbol}`;
}

function extractPrice(kind: BrapiKind, parsed: any): { price: number | null; raw: unknown } {
  if (kind === 'futures') {
    const arr = parsed?.quotes ?? parsed?.results ?? [];
    const q = arr?.[0];
    if (!q) return { price: null, raw: parsed };
    const p = q.close ?? q.settlement ?? q.lastPrice ?? null;
    return { price: p != null ? Number(p) : null, raw: q };
  }
  if (kind === 'moedas') {
    const c = parsed?.currency?.[0];
    const p = c?.bidPrice ? parseFloat(c.bidPrice) : null;
    return { price: p, raw: c };
  }
  const r = parsed?.results?.[0];
  const p = r?.regularMarketPrice ?? null;
  return { price: p != null ? Number(p) : null, raw: r };
}

async function fetchOne(asset: { id: string; symbol: string; brapi_kind: string; brapi_symbol: string }) {
  const start = Date.now();
  let actualSymbol = asset.brapi_symbol;

  if (asset.brapi_kind === 'futures' && /^[A-Z]{2,4}$/.test(actualSymbol)) {
    const fm = await resolveFrontMonthFromDb(actualSymbol, asset.id);
    if (!fm) return { symbol: asset.symbol, ok: false, error: 'contrato vigente não encontrado no cache (rode refresh-futures-contracts)' };
    actualSymbol = fm;
  }

  const url = buildBrapiUrl(asset.brapi_kind as BrapiKind, actualSymbol);
  const rl = await consumeRateLimit();
  if (!rl.allowed) {
    await log('warn', 'rate_limit_blocked', { asset_id: asset.id, metadata: { symbol: asset.symbol, actual_symbol: actualSymbol } });
    return { symbol: asset.symbol, ok: false, error: `Rate limit (${rl.current_count}/${rl.max_count})`, blocked: true };
  }

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${BRAPI_TOKEN}` } });
    const duration = Date.now() - start;
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* */ }

    if (!res.ok) {
      await log('error', 'brapi_call_failed', {
        asset_id: asset.id, request_url: url, response_status: res.status,
        response_body: parsed ?? { raw: text.slice(0, 500) },
        error_message: `brapi ${res.status} ${parsed?.message ?? ''}`.trim(),
        duration_ms: duration,
        metadata: { symbol: asset.symbol, actual_symbol: actualSymbol, kind: asset.brapi_kind }
      });
      return { symbol: asset.symbol, ok: false, error: `brapi ${res.status}: ${parsed?.message ?? text.slice(0,80)}`, http_status: res.status };
    }

    const { price, raw } = extractPrice(asset.brapi_kind as BrapiKind, parsed);
    if (price == null) {
      await log('warn', 'brapi_no_price', {
        asset_id: asset.id, request_url: url, response_status: res.status,
        response_body: parsed, duration_ms: duration,
        metadata: { symbol: asset.symbol, actual_symbol: actualSymbol, kind: asset.brapi_kind }
      });
      return { symbol: asset.symbol, ok: false, error: 'sem preço no retorno' };
    }

    const { error: insErr } = await supa.from('quotes').insert({
      asset_id: asset.id, price, raw, source: 'brapi'
    });
    if (insErr) {
      await log('error', 'quote_insert_failed', { asset_id: asset.id, error_message: insErr.message, metadata: { symbol: asset.symbol, price } });
      return { symbol: asset.symbol, ok: false, error: insErr.message };
    }

    await log('info', 'quote_inserted', {
      asset_id: asset.id, request_url: url, response_status: res.status, duration_ms: duration,
      metadata: { symbol: asset.symbol, actual_symbol: actualSymbol, price }
    });

    return { symbol: asset.symbol, ok: true, price, actual_symbol: actualSymbol };
  } catch (e) {
    const err = e as Error;
    await log('error', 'brapi_call_exception', {
      asset_id: asset.id, request_url: url, error_message: err.message, error_stack: err.stack ?? null,
      duration_ms: Date.now() - start,
      metadata: { symbol: asset.symbol, actual_symbol: actualSymbol }
    });
    return { symbol: asset.symbol, ok: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  if (!BRAPI_TOKEN) {
    await log('error', 'config_missing', { error_message: 'token_brapi não configurado' });
    return new Response(JSON.stringify({ error: 'token_brapi não configurado' }), { status: 400 });
  }

  let source = 'unknown'; let onlyAssetId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    source = body?.source ?? source;
    onlyAssetId = body?.asset_id ?? null;
  } catch { /* */ }

  await log('info', 'run_started', { metadata: { source, only_asset_id: onlyAssetId } });

  let query = supa.from('assets').select('id, symbol, brapi_kind, brapi_symbol').eq('active', true);
  if (onlyAssetId) query = query.eq('id', onlyAssetId);
  const { data: assets, error: assetsErr } = await query;

  if (assetsErr || !assets) {
    await log('error', 'assets_query_failed', { error_message: assetsErr?.message ?? 'no assets' });
    return new Response(JSON.stringify({ error: assetsErr?.message ?? 'no assets' }), { status: 500 });
  }

  const results = [];
  for (const asset of assets) {
    const r = await fetchOne(asset);
    results.push(r);
  }

  fetch(`${SUPABASE_URL}/functions/v1/process-alerts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'fetch-quotes' })
  }).catch((e) => log('error', 'process_alerts_dispatch_failed', { error_message: (e as Error).message }));

  const duration_ms = Date.now() - startedAt;
  const success = results.filter((r) => r.ok).length;
  await log('info', 'run_completed', {
    duration_ms,
    metadata: { source, total: results.length, success, failed: results.length - success, front_month_cache: Object.fromEntries(frontMonthCache) }
  });

  return new Response(JSON.stringify({ ok: true, duration_ms, assets: results.length, success, results }), { headers: { 'Content-Type': 'application/json' } });
});
