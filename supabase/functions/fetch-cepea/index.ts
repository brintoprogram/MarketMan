// fetch-cepea v4 — fonte: NoticiasAgricolas.com.br (republica os indicadores
// CEPEA/ESALQ diariamente sem WAF agressivo). Acesso via Jina Reader
// (r.jina.ai) que normaliza HTML em markdown limpo.
//
// CEPEA original (cepea.org.br) é bloqueado por Cloudflare WAF mesmo via
// Jina com X-Engine: browser. Por isso usamos o re-publicador.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NA_BASE = 'https://www.noticiasagricolas.com.br/cotacoes';
const JINA_PREFIX = 'https://r.jina.ai/';
const SOURCE = 'fetch-cepea';

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function log(level: 'debug'|'info'|'warn'|'error', event: string, fields: Record<string, unknown> = {}) {
  try { await supa.from('system_logs').insert({ level, source: SOURCE, event, ...fields }); }
  catch (e) { console.error('log failed:', e); }
}

function parseBrNumber(s: string): number | null {
  if (!s) return null;
  const cleaned = s.trim().replace(/[^0-9.,\-]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseBrDate(s: string): string | null {
  if (!s) return null;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

interface ParseResult {
  price?: number | null;
  variation_pct?: number | null;
  date?: string | null;
  source_label?: string;
  raw_sample?: string;
}

function parseNoticiasAgricolas(text: string): ParseResult {
  const result: ParseResult = {};

  const cepeaIdx = text.search(/Cepea|CEPEA/);
  if (cepeaIdx >= 0) {
    const block = text.substring(cepeaIdx, Math.min(text.length, cepeaIdx + 800));

    const dateMatch = block.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) result.date = parseBrDate(dateMatch[1]);

    const afterDate = dateMatch ? block.substring(block.indexOf(dateMatch[1]) + 10) : block;
    const priceMatch = afterDate.match(/([\d.]+,\d{2,4})/);
    if (priceMatch) result.price = parseBrNumber(priceMatch[1]);

    const varMatch = afterDate.match(/([+\-]\d+[.,]\d+)/);
    if (varMatch) result.variation_pct = parseBrNumber(varMatch[1]);

    const labelMatch = text.substring(Math.max(0, cepeaIdx - 100), cepeaIdx + 100).match(/Indicador\s+[\w\sÁ-úÀ-ú]+?Cepea/i);
    if (labelMatch) result.source_label = labelMatch[0].replace(/\s+/g, ' ').trim();

    result.raw_sample = block.replace(/\s+/g, ' ').slice(0, 1000);
  } else {
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) result.date = parseBrDate(dateMatch[1]);
    const priceMatch = text.match(/([\d.]{1,5},\d{2,4})/);
    if (priceMatch) result.price = parseBrNumber(priceMatch[1]);
    result.raw_sample = text.slice(0, 1000).replace(/\s+/g, ' ');
  }

  return result;
}

async function fetchOne(asset: { id: string; symbol: string; brapi_symbol: string }) {
  const start = Date.now();
  const targetUrl = `${NA_BASE}/${asset.brapi_symbol}`;
  const proxyUrl = `${JINA_PREFIX}${targetUrl}`;

  try {
    const res = await fetch(proxyUrl, {
      headers: {
        'Accept': 'text/markdown',
        'X-Return-Format': 'markdown',
        'X-No-Cache': 'true'
      }
    });
    const duration = Date.now() - start;
    const text = await res.text();

    if (!res.ok) {
      await log('error', 'cepea_proxy_failed', {
        asset_id: asset.id, request_url: proxyUrl, response_status: res.status,
        response_body: { excerpt: text.slice(0, 500) },
        error_message: `jina ${res.status}`, duration_ms: duration,
        metadata: { symbol: asset.symbol, source_url: targetUrl }
      });
      return { symbol: asset.symbol, ok: false, error: `proxy ${res.status}` };
    }

    if (text.includes('Just a moment') || text.includes('Performing security verification')) {
      await log('warn', 'cepea_cf_challenge', {
        asset_id: asset.id, request_url: proxyUrl, response_status: res.status,
        response_body: { sample: text.slice(0, 600) },
        duration_ms: duration, metadata: { symbol: asset.symbol }
      });
      return { symbol: asset.symbol, ok: false, error: 'WAF não ultrapassado' };
    }

    const parsed = parseNoticiasAgricolas(text);

    if (parsed.price == null) {
      await log('warn', 'cepea_no_price', {
        asset_id: asset.id, request_url: proxyUrl, response_status: res.status,
        response_body: { parsed, sample: parsed.raw_sample },
        duration_ms: duration, metadata: { symbol: asset.symbol }
      });
      return { symbol: asset.symbol, ok: false, error: 'sem preço extraído' };
    }

    const { error: insErr } = await supa.from('quotes').insert({
      asset_id: asset.id, price: parsed.price,
      raw: parsed as unknown as Record<string, unknown>,
      source: 'cepea-noticiasagricolas',
      fetched_at: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString()
    });

    if (insErr) {
      await log('error', 'cepea_insert_failed', { asset_id: asset.id, error_message: insErr.message, metadata: { symbol: asset.symbol, price: parsed.price } });
      return { symbol: asset.symbol, ok: false, error: insErr.message };
    }

    await log('info', 'cepea_quote_inserted', {
      asset_id: asset.id, request_url: proxyUrl, response_status: res.status,
      duration_ms: duration,
      metadata: {
        symbol: asset.symbol, price: parsed.price,
        variation_pct: parsed.variation_pct, date: parsed.date,
        source_label: parsed.source_label
      }
    });

    return { symbol: asset.symbol, ok: true, price: parsed.price, parsed };
  } catch (e) {
    const err = e as Error;
    await log('error', 'cepea_exception', {
      asset_id: asset.id, request_url: proxyUrl,
      error_message: err.message, error_stack: err.stack ?? null,
      duration_ms: Date.now() - start, metadata: { symbol: asset.symbol }
    });
    return { symbol: asset.symbol, ok: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  const startedAt = Date.now();

  let onlyAssetId: string | null = null;
  try { const body = await req.json().catch(() => ({})); onlyAssetId = body?.asset_id ?? null; } catch { /* */ }

  await log('info', 'run_started', { metadata: { only_asset_id: onlyAssetId } });

  let query = supa.from('assets').select('id, symbol, brapi_symbol').eq('active', true).eq('brapi_kind', 'cepea');
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

  const duration_ms = Date.now() - startedAt;
  const success = results.filter((r) => r.ok).length;
  await log('info', 'run_completed', { duration_ms, metadata: { total: results.length, success, failed: results.length - success } });

  return new Response(JSON.stringify({ ok: true, duration_ms, total: results.length, success, results }), { headers: { 'Content-Type': 'application/json' } });
});
