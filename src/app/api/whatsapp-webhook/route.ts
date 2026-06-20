// Webhook do Z-API. Hoje além de logar mensagens recebidas, parseia comandos
// simples e responde via Z-API (vira interface de consulta).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ZAPI_INSTANCE_ID = process.env.zapi_instance_id ?? '';
const ZAPI_INSTANCE_TOKEN = process.env.zapi_instance_token ?? '';
const ZAPI_CLIENT_TOKEN = process.env.zapi_client_token ?? '';

function makeClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

async function zapiSendText(phone: string, message: string) {
  if (!ZAPI_INSTANCE_ID || !ZAPI_INSTANCE_TOKEN || !ZAPI_CLIENT_TOKEN) return null;
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
      body: JSON.stringify({ phone, message })
    });
    return res.ok;
  } catch { return null; }
}

function fmtPrice(value: number | string, unit?: string | null): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return '—';
  const usd = unit?.includes('USD');
  return n.toLocaleString(usd ? 'en-US' : 'pt-BR', {
    style: 'currency', currency: usd ? 'USD' : 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 4
  });
}

function fmtPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function icon(value: number | null): string {
  if (value == null) return '⚪';
  if (value > 0) return '🟢';
  if (value < 0) return '🔴';
  return '⚪';
}

function normalizePhone(p: string): string {
  const digits = String(p).replace(/\D+/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

// ============= command handlers =============
async function handleHelp(): Promise<string> {
  return [
    '🤖 *Comandos disponíveis*',
    '',
    '*PREÇO ICF*  cotação de 1 ativo',
    '*PREÇOS*     tabela de todos os ativos',
    '*STATUS*     resumo de alertas',
    '*PAUSAR*     pausa alertas por 24h',
    '*ATIVAR*     reativa alertas',
    '*PARAR*      desativa todos os alertas',
    '*AJUDA*      mostra este menu',
    '',
    '— MarketMan'
  ].join('\n');
}

async function handlePrice(supa: any, symbol: string): Promise<string> {
  const sym = symbol.toUpperCase().trim();
  const { data: asset } = await supa.from('assets')
    .select('id, symbol, name, unit, category')
    .eq('active', true)
    .or(`symbol.eq.${sym},symbol.ilike.%${sym}%`)
    .order('display_order').limit(1).maybeSingle();
  if (!asset) return `❌ Ativo *${sym}* não encontrado. Mande *PREÇOS* pra ver a lista.`;

  const { data: latest } = await supa.from('quotes')
    .select('price, fetched_at')
    .eq('asset_id', asset.id)
    .order('fetched_at', { ascending: false }).limit(1).maybeSingle();
  if (!latest) return `⚠️ Sem cotação coletada pra *${asset.symbol}* (${asset.name}).`;

  const priceNow = Number(latest.price);
  // var 1d e 7d
  const since1d = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: q1d } = await supa.from('quotes').select('price').eq('asset_id', asset.id).gte('fetched_at', since1d).order('fetched_at', { ascending: true }).limit(1).maybeSingle();
  const { data: q7d } = await supa.from('quotes').select('price').eq('asset_id', asset.id).gte('fetched_at', since7d).order('fetched_at', { ascending: true }).limit(1).maybeSingle();

  const pct1d = q1d ? ((priceNow - Number(q1d.price)) / Number(q1d.price)) * 100 : null;
  const pct7d = q7d ? ((priceNow - Number(q7d.price)) / Number(q7d.price)) * 100 : null;

  return [
    `*${asset.symbol}* · ${asset.name}`,
    `${fmtPrice(priceNow, asset.unit)}  _${asset.unit ?? ''}_`,
    `${icon(pct1d)} 1d: ${fmtPct(pct1d)}`,
    `${icon(pct7d)} 7d: ${fmtPct(pct7d)}`,
    ``,
    `— MarketMan`
  ].join('\n');
}

async function handleAllPrices(supa: any): Promise<string> {
  const { data: assets } = await supa.from('assets')
    .select('id, symbol, name, unit')
    .eq('active', true)
    .order('display_order');
  if (!assets || assets.length === 0) return '⚠️ Nenhum ativo ativo.';

  const ids = assets.map((a: any) => a.id);
  const since1d = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: quotes } = await supa.from('quotes')
    .select('asset_id, price, fetched_at')
    .in('asset_id', ids)
    .order('fetched_at', { ascending: false });

  const latestByAsset = new Map<string, number>();
  for (const q of quotes ?? []) {
    if (!latestByAsset.has(q.asset_id)) latestByAsset.set(q.asset_id, Number(q.price));
  }
  // 1d ago
  const ago1dByAsset = new Map<string, number>();
  const { data: ago1d } = await supa.from('quotes')
    .select('asset_id, price, fetched_at')
    .in('asset_id', ids)
    .gte('fetched_at', since1d)
    .order('fetched_at', { ascending: true });
  for (const q of ago1d ?? []) {
    if (!ago1dByAsset.has(q.asset_id)) ago1dByAsset.set(q.asset_id, Number(q.price));
  }

  const lines: string[] = ['📊 *Mercado agora*', ''];
  for (const a of assets) {
    const p = latestByAsset.get(a.id);
    if (p == null) continue;
    const old = ago1dByAsset.get(a.id);
    const pct = old && old !== 0 ? ((p - old) / old) * 100 : null;
    lines.push(`${icon(pct)} *${a.symbol}*  ${fmtPrice(p, a.unit)}  ${fmtPct(pct)}`);
  }
  lines.push('', '— MarketMan');
  return lines.join('\n');
}

async function handleStatus(supa: any, userId: string): Promise<string> {
  const { count: activeCount } = await supa.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('active', true);
  const { count: totalCount } = await supa.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  const { data: lastHist } = await supa.from('alert_history').select('sent_at, asset_id').eq('user_id', userId).order('sent_at', { ascending: false }).limit(1).maybeSingle();
  const { data: profile } = await supa.from('profiles').select('alerts_paused_until').eq('id', userId).single();
  const { count: reportCount } = await supa.from('scheduled_reports').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('active', true);

  const pausedUntil = profile?.alerts_paused_until ? new Date(profile.alerts_paused_until) : null;
  const isPaused = pausedUntil && pausedUntil > new Date();

  return [
    '📋 *Status*',
    '',
    `Alertas: *${activeCount ?? 0}* ativos · ${totalCount ?? 0} total`,
    `Relatórios agendados: *${reportCount ?? 0}*`,
    isPaused ? `⏸ Alertas pausados até ${pausedUntil.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : '✅ Alertas em execução',
    lastHist ? `Último disparo: ${new Date(lastHist.sent_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : 'Sem disparos ainda',
    '',
    '— MarketMan'
  ].join('\n');
}

async function handlePause(supa: any, userId: string, hours = 24): Promise<string> {
  const until = new Date(Date.now() + hours * 3600 * 1000);
  await supa.from('profiles').update({ alerts_paused_until: until.toISOString() }).eq('id', userId);
  return `⏸ Alertas pausados por *${hours}h*. Vão voltar em ${until.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.\n\nMande *ATIVAR* a qualquer momento pra retomar antes.`;
}

async function handleActivate(supa: any, userId: string): Promise<string> {
  await supa.from('profiles').update({ alerts_paused_until: null }).eq('id', userId);
  return `✅ Alertas retomados. Vamos te avisar normalmente.`;
}

async function handleStop(supa: any, userId: string): Promise<string> {
  const { count } = await supa.from('alerts').update({ active: false }).eq('user_id', userId).eq('active', true);
  return `🛑 Alertas desativados (${count ?? 0}). Mande *ATIVAR* pra reativar todos.`;
}

async function handleActivateAll(supa: any, userId: string): Promise<string> {
  await supa.from('alerts').update({ active: true }).eq('user_id', userId);
  await supa.from('profiles').update({ alerts_paused_until: null }).eq('id', userId);
  const { count } = await supa.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('active', true);
  return `✅ ${count ?? 0} alertas reativados.`;
}

// ============= main =============
export async function POST(request: Request) {
  let payload: any = null;
  try { payload = await request.json(); } catch { /* */ }

  const supa = makeClient();

  // 1. SEMPRE loga
  try {
    await supa.from('whatsapp_inbox').insert({
      from_phone: payload?.phone ?? payload?.from ?? null,
      message_id: payload?.messageId ?? payload?.id ?? null,
      payload
    });
  } catch { /* */ }

  // 2. Z-API webhook tem vários formatos. Extrai o que conseguir.
  const phone: string | undefined = payload?.phone ?? payload?.from;
  // mensagem de texto pode vir em payload.text.message, payload.message, etc
  const text: string | undefined =
    payload?.text?.message ?? payload?.text?.body ?? payload?.text ??
    payload?.message?.text ?? payload?.message?.body ?? payload?.body;
  const fromMe: boolean = !!(payload?.fromMe ?? payload?.fromApi);
  const isStatusReply: boolean = !!(payload?.isStatusReply);

  // ignora mensagens nossas (echo) e status updates
  if (!phone || !text || fromMe || isStatusReply) return new NextResponse(null, { status: 200 });

  // 3. Identifica usuário pelo telefone
  const normalized = normalizePhone(phone);
  const { data: profile } = await supa.from('profiles')
    .select('id, whatsapp_phone, whatsapp_verified')
    .eq('whatsapp_phone', normalized)
    .eq('whatsapp_verified', true)
    .maybeSingle();

  // 4. Parse comando
  const norm = String(text).toLowerCase().trim();
  let reply: string | null = null;

  try {
    const precoMatch = norm.match(/^pre[cç]o\s+([\w_]+)/);
    if (precoMatch) {
      reply = await handlePrice(supa, precoMatch[1]);
    } else if (/^pre[cç]os$/i.test(norm)) {
      reply = await handleAllPrices(supa);
    } else if (/^(ajuda|help|menu|\?)$/i.test(norm)) {
      reply = await handleHelp();
    } else if (profile) {
      if (/^status$/i.test(norm)) {
        reply = await handleStatus(supa, profile.id);
      } else if (/^pausar(\s+(\d+)\s*h?)?$/i.test(norm)) {
        const m = norm.match(/^pausar(?:\s+(\d+))?/i);
        const hours = m && m[1] ? parseInt(m[1]) : 24;
        reply = await handlePause(supa, profile.id, Math.min(720, Math.max(1, hours)));
      } else if (/^ativar(\s+(tudo|todos|all))?$/i.test(norm)) {
        reply = /\b(tudo|todos|all)\b/i.test(norm)
          ? await handleActivateAll(supa, profile.id)
          : await handleActivate(supa, profile.id);
      } else if (/^parar(\s+alertas)?$/i.test(norm)) {
        reply = await handleStop(supa, profile.id);
      }
    }
  } catch (e) {
    await supa.from('system_logs').insert({
      level: 'error', source: 'api/whatsapp-webhook', event: 'command_exception',
      error_message: (e as Error).message, metadata: { phone: normalized, text: text.slice(0, 200) }
    });
  }

  if (reply && phone) {
    await zapiSendText(phone, reply);
    await supa.from('system_logs').insert({
      level: 'info', source: 'api/whatsapp-webhook', event: 'command_replied',
      user_id: profile?.id ?? null,
      metadata: { phone: normalized, command: text.slice(0, 80), reply_length: reply.length }
    });
  }

  return new NextResponse(null, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST messages here' });
}
