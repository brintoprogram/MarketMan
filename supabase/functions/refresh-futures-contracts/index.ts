// refresh-futures-contracts — pagina /v2/futures/list (limit=100 por página)
// e popula public.futures_contracts. Deve rodar 1x por dia via pg_cron.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BRAPI_TOKEN = Deno.env.get('token_brapi') ?? '';
const BRAPI_BASE = 'https://brapi.dev/api';
const SOURCE = 'refresh-futures-contracts';

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

Deno.serve(async () => {
  const startedAt = Date.now();
  if (!BRAPI_TOKEN) {
    await log('error', 'config_missing', { error_message: 'token_brapi não configurado' });
    return new Response(JSON.stringify({ error: 'token_brapi não configurado' }), { status: 400 });
  }

  await log('info', 'run_started');

  let page = 1;
  const limit = 100;
  let totalPages = 1;
  let allContracts: any[] = [];
  let aborted = false;

  while (page <= totalPages) {
    const url = `${BRAPI_BASE}/v2/futures/list?limit=${limit}&page=${page}`;
    const start = Date.now();
    const rl = await consumeRateLimit();
    if (!rl.allowed) { await log('warn', 'rate_limit_blocked', { request_url: url, metadata: { page } }); aborted = true; break; }

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${BRAPI_TOKEN}` } });
      const text = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* */ }
      const duration = Date.now() - start;

      if (!res.ok) {
        await log('error', 'page_fetch_failed', {
          request_url: url, response_status: res.status,
          response_body: parsed ?? { raw: text.slice(0, 300) },
          error_message: `brapi ${res.status}`, duration_ms: duration, metadata: { page }
        });
        aborted = true; break;
      }

      const items = parsed?.futures ?? [];
      allContracts = allContracts.concat(items);
      totalPages = parsed?.pagination?.totalPages ?? page;

      await log('info', 'page_fetched', {
        request_url: url, response_status: res.status, duration_ms: duration,
        metadata: { page, total_pages: totalPages, items: items.length, accumulated: allContracts.length }
      });
      page++;
    } catch (e) {
      const err = e as Error;
      await log('error', 'page_fetch_exception', {
        request_url: url, error_message: err.message, error_stack: err.stack ?? null,
        duration_ms: Date.now() - start, metadata: { page }
      });
      aborted = true; break;
    }
  }

  if (aborted && !allContracts.length) {
    return new Response(JSON.stringify({ ok: false, reason: 'aborted before any page' }), { status: 502 });
  }

  const rows = allContracts
    .filter((c) => c?.symbol && c?.underlyingAsset)
    .map((c) => ({
      symbol: c.symbol,
      underlying_asset: c.underlyingAsset,
      expiration_date: c.expirationDate ?? null,
      asset_description: c.assetDescription ?? null,
      quotation_type: c.quotationType ?? null,
      raw: c as unknown as Record<string, unknown>,
      refreshed_at: new Date().toISOString()
    }));

  const { error: delErr } = await supa.from('futures_contracts').delete().neq('symbol', '___never___');
  if (delErr) await log('error', 'cache_clear_failed', { error_message: delErr.message });

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error: insErr, count } = await supa.from('futures_contracts').insert(chunk, { count: 'exact' });
    if (insErr) await log('error', 'cache_insert_failed', { error_message: insErr.message, metadata: { chunk_start: i, chunk_size: chunk.length } });
    else inserted += count ?? chunk.length;
  }

  const sampleUnderlyings = Array.from(new Set(rows.slice(0, 1000).map((r) => r.underlying_asset))).sort();

  const duration_ms = Date.now() - startedAt;
  await log('info', 'run_completed', {
    duration_ms,
    metadata: {
      pages_fetched: page - 1, total_contracts: allContracts.length,
      inserted, sample_underlyings: sampleUnderlyings.slice(0, 40), unique_underlyings: sampleUnderlyings.length
    }
  });

  return new Response(
    JSON.stringify({
      ok: true, duration_ms,
      pages_fetched: page - 1, total_contracts: allContracts.length, inserted,
      unique_underlyings: sampleUnderlyings.length,
      sample_underlyings: sampleUnderlyings.slice(0, 40)
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
