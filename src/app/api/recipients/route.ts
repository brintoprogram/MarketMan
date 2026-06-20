import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ZapiClient, normalizePhone } from '@/lib/zapi';

// POST /api/recipients          { action: 'send_otp', name, phone }
// POST /api/recipients          { action: 'verify_otp', id, otp }
// POST /api/recipients          { action: 'resend_otp', id }
// DELETE /api/recipients?id=    remove (não pode remover is_self)

export async function POST(request: Request) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const action = body?.action as string | undefined;

  if (action === 'send_otp') {
    const name = String(body?.name ?? '').trim();
    const phoneRaw = String(body?.phone ?? '').trim();
    if (!name || !phoneRaw) return NextResponse.json({ error: 'Nome e telefone obrigatórios' }, { status: 400 });
    const phone = normalizePhone(phoneRaw);
    if (phone.length < 12) return NextResponse.json({ error: 'Número incompleto (DDD + número)' }, { status: 400 });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // upsert: se já existe pra esse user+phone, atualiza OTP
    const { data: existing } = await supa.from('recipients').select('id, verified, is_self').eq('user_id', user.id).eq('phone', phone).maybeSingle();

    let id: string;
    if (existing) {
      if (existing.verified) return NextResponse.json({ error: 'Esse número já está verificado pra você' }, { status: 400 });
      id = existing.id;
      await supa.from('recipients').update({ name, otp, otp_expires_at: expiresAt }).eq('id', id);
    } else {
      const ins = await supa.from('recipients').insert({ user_id: user.id, name, phone, verified: false, otp, otp_expires_at: expiresAt }).select('id').single();
      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
      id = ins.data.id;
    }

    try {
      const zapi = new ZapiClient({
        instanceId: process.env.zapi_instance_id!,
        instanceToken: process.env.zapi_instance_token!,
        clientToken: process.env.zapi_client_token!
      });
      await zapi.sendText(phone, `*MarketMan* — código pra ${name}: *${otp}*\n\nVálido por 10 minutos. Esse número foi adicionado como destinatário de alertas. Se não foi você, ignore.`);
    } catch (err) {
      return NextResponse.json({ error: `Falha ao enviar OTP: ${(err as Error).message}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true, id });
  }

  if (action === 'verify_otp') {
    const id = String(body?.id ?? '');
    const otp = String(body?.otp ?? '');
    if (!id || !otp || otp.length !== 6) return NextResponse.json({ error: 'Código inválido' }, { status: 400 });

    const { data: rec } = await supa.from('recipients').select('otp, otp_expires_at').eq('id', id).eq('user_id', user.id).single();
    if (!rec?.otp) return NextResponse.json({ error: 'Nenhum código pendente' }, { status: 400 });
    if (new Date(rec.otp_expires_at!) < new Date()) return NextResponse.json({ error: 'Código expirado. Solicite novo.' }, { status: 400 });
    if (rec.otp !== otp) return NextResponse.json({ error: 'Código não confere' }, { status: 400 });

    await supa.from('recipients').update({ verified: true, otp: null, otp_expires_at: null }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'resend_otp') {
    const id = String(body?.id ?? '');
    const { data: rec } = await supa.from('recipients').select('phone, name').eq('id', id).eq('user_id', user.id).single();
    if (!rec) return NextResponse.json({ error: 'Destinatário não encontrado' }, { status: 404 });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await supa.from('recipients').update({ otp, otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() }).eq('id', id);
    try {
      const zapi = new ZapiClient({ instanceId: process.env.zapi_instance_id!, instanceToken: process.env.zapi_instance_token!, clientToken: process.env.zapi_client_token! });
      await zapi.sendText(rec.phone, `*MarketMan* — código pra ${rec.name}: *${otp}*\n\nVálido por 10 minutos.`);
    } catch (err) {
      return NextResponse.json({ error: `Falha ao reenviar OTP: ${(err as Error).message}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
}

export async function DELETE(request: Request) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  const { data: rec } = await supa.from('recipients').select('is_self').eq('id', id).eq('user_id', user.id).single();
  if (!rec) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  if (rec.is_self) return NextResponse.json({ error: 'Não dá pra remover seu próprio número (use Configurações)' }, { status: 400 });
  const { error } = await supa.from('recipients').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
