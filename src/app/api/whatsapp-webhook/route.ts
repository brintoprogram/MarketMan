import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Webhook do Z-API: recebe mensagens, loga e IGNORA.
// O Z-API exige só HTTP 200 — não respondemos nada via WhatsApp.
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    await supa.from('whatsapp_inbox').insert({
      from_phone: payload?.phone ?? payload?.from ?? null,
      message_id: payload?.messageId ?? payload?.id ?? null,
      payload
    });
  } catch {
    // engole erro de propósito — Z-API só precisa de 200
  }
  return new NextResponse(null, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
