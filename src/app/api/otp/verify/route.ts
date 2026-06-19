import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { otp } = await request.json();
  if (!otp || typeof otp !== 'string' || otp.length !== 6) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
  }

  const { data: profile } = await supa
    .from('profiles')
    .select('whatsapp_otp, whatsapp_otp_expires_at')
    .eq('id', user.id)
    .single();

  if (!profile?.whatsapp_otp) {
    return NextResponse.json({ error: 'Nenhum código pendente. Solicite novamente.' }, { status: 400 });
  }
  if (new Date(profile.whatsapp_otp_expires_at!) < new Date()) {
    return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 });
  }
  if (profile.whatsapp_otp !== otp) {
    return NextResponse.json({ error: 'Código não confere.' }, { status: 400 });
  }

  await supa
    .from('profiles')
    .update({
      whatsapp_verified: true,
      whatsapp_otp: null,
      whatsapp_otp_expires_at: null
    })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
