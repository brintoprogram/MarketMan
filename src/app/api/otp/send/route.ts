import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ZapiClient, normalizePhone } from '@/lib/zapi';

export async function POST(request: Request) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { phone } = await request.json();
  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
  }

  const normalized = normalizePhone(phone);
  if (normalized.length < 12) {
    return NextResponse.json({ error: 'Número incompleto. Use DDD + número.' }, { status: 400 });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: dbErr } = await supa
    .from('profiles')
    .update({
      whatsapp_phone: normalized,
      whatsapp_otp: otp,
      whatsapp_otp_expires_at: expiresAt,
      whatsapp_verified: false
    })
    .eq('id', user.id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  try {
    const zapi = new ZapiClient({
      instanceId: process.env.zapi_instance_id!,
      instanceToken: process.env.zapi_instance_token!,
      clientToken: process.env.zapi_client_token!
    });
    await zapi.sendText(
      normalized,
      `*MarketMan* — seu código é: *${otp}*\n\nVálido por 10 minutos. Se não foi você, ignore.`
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao enviar WhatsApp: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
