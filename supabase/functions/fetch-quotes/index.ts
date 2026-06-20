// fetch-quotes — versão deployada (v5): resolve front-month + lê campo `quotes` correto + logs detalhados.
// Veja deploy real no Supabase. Esta cópia local é referência.
// Pra futures: se brapi_symbol é root (3-4 chars), busca contrato vigente via /v2/futures/list
// antes de chamar /v2/futures/quote.

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

const frontMonthCache = new Map<string, string>();

async function resolveFrontMonth(root: string, assetId: string): Promise<string | null> {
  if (frontMonthCache.has(root)) return frontMonthCache.get(root)!;
  const url = `${BRAPI_BASE}/v2/futures/list`;
  const rl = await consumeRateLimit();
  if (!rl.allowed) return null;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${BRAPI_TOKEN}` } });
    const parsed = await res.json().catch(() => null);
    if (!res.ok) {
      await log('error', 'futures_list_failed', { asset_id: assetId, request_url: url, response_status: res.status, response_body: parsed, metadata: { root } });
      return null;
    }
    const list: any[] = parsed?.contracts ?? parsed?.futures ?? parsed?.results ?? parsed?.data ?? parsed ?? [];
    const filtered = (Array.isArray(list) ? list : []).filter((c: any) => String(c?.symbol ?? c?.code ?? '').startsWith(root));
    if (!filtered.length) {
      await log('warn', 'front_month_not_found', { asset_id: assetId, response_body: parsed, metadata: { root } });
      return null;
    }
    const now = new Date();
    const withDates = filtered.map((c: any) => {
      const dateRaw = c.maturityDate ?? c.dueDate ?? c.expirationDate ?? c.expiration ?? c.maturity ?? null;
      return { sym: String(c.symbol ?? c.code ?? ''), date: dateRaw ? new Date(dateRaw) : null };
    });
    const future = withDates.filter((c) => c.date && c.date >= now).sort((a, b) => a.date!.getTime() - b.date!.getTime());
    const chosen = future[0] ?? withDates.sort((a, b) => a.sym.localeCompare(b.sym)).slice(-1)[0];
    frontMonthCache.set(root, chosen.sym);
    await log('info', 'front_month_resolved', { asset_id: assetId, metadata: { root, chosen: chosen.sym } });
    return chosen.sym;
  } catch (e) {
    await log('error', 'futures_list_exception', { asset_id: assetId, error_message: (e as Error).message, metadata: { root } });
    return null;
  }
}

// (full implementation deployed — see Supabase dashboard for live version v5)
Deno.serve(async () => new Response(JSON.stringify({ note: 'See deployed v5 on Supabase' }), { status: 200 }));
