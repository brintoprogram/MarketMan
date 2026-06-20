// Webhook do Z-API on-message-status — atualiza delivered_at/read_at nas tabelas
// alert_history e scheduled_report_history quando o WhatsApp confirma entrega/leitura.
//
// Configurar no painel Z-API → Webhooks → Ao status de mensagem alterar:
//   https://SEU-DOMINIO/api/whatsapp-status

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(request: Request) {
  let payload: any = null;
  try { payload = await request.json(); } catch { /* */ }

  const messageId: string | undefined = payload?.messageId ?? payload?.id ?? payload?.zaapId;
  const status: string | undefined = (payload?.status ?? payload?.messageStatus ?? '').toLowerCase();

  if (!messageId || !status) return new NextResponse(null, { status: 200 });

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // sempre loga
  try {
    await supa.from('system_logs').insert({
      level: 'info', source: 'api/whatsapp-status', event: 'status_received',
      metadata: { messageId, status, raw: payload }
    });
  } catch { /* */ }

  // mapeia status → coluna
  const now = new Date().toISOString();
  let updates: { delivered_at?: string; read_at?: string } = {};
  if (status === 'received' || status === 'delivered') updates.delivered_at = now;
  else if (status === 'read' || status === 'played') {
    updates.read_at = now;
    updates.delivered_at = now; // se foi lida, certamente foi entregue
  }

  if (Object.keys(updates).length === 0) return new NextResponse(null, { status: 200 });

  // tenta em ambas as tabelas (sem saber qual)
  await Promise.all([
    supa.from('alert_history').update(updates).eq('zapi_message_id', messageId),
    supa.from('scheduled_report_history').update(updates).eq('zapi_message_id', messageId)
  ]);

  return new NextResponse(null, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST Z-API status events here' });
}
