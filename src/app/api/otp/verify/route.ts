import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ZapiClient } from '@/lib/zapi';

async function tryWelcomeMessage(userId: string, phone: string) {
  try {
    const supa = createClient();
    // contagem rápida do contexto do user
    const [{ count: alertCount }, { count: reportCount }] = await Promise.all([
      supa.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('active', true),
      supa.from('scheduled_reports').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('active', true)
    ]);

    const { data: profile } = await supa.from('profiles').select('full_name').eq('id', userId).single();
    const firstName = (profile?.full_name?.split(' ')[0]) ?? null;

    const lines = [
      `🎉 *Bem-vindo ao MarketMan${firstName ? `, ${firstName}` : ''}!*`,
      ``,
      `Seu WhatsApp tá conectado e funcionando.`,
      ``,
      `📋 *Sua conta agora*`,
      `• ${alertCount ?? 0} alerta${(alertCount ?? 0) === 1 ? '' : 's'} ativo${(alertCount ?? 0) === 1 ? '' : 's'}`,
      `• ${reportCount ?? 0} relatório${(reportCount ?? 0) === 1 ? '' : 's'} agendado${(reportCount ?? 0) === 1 ? '' : 's'}`,
      ``,
      `💡 *Comandos rápidos*`,
      `• *PREÇO ICF* — cotação de 1 ativo`,
      `• *PREÇOS* — tabela com todos`,
      `• *STATUS* — resumo da sua conta`,
      `• *PAUSAR 24H* — silencia alertas`,
      `• *AJUDA* — menu completo`,
      ``,
      `A partir de agora, vou te avisar aqui quando o mercado mexer.`,
      ``,
      `— MarketMan`
    ];

    const zapi = new ZapiClient({
      instanceId: process.env.zapi_instance_id!,
      instanceToken: process.env.zapi_instance_token!,
      clientToken: process.env.zapi_client_token!
    });
    await zapi.sendText(phone, lines.join('\n'));
    await supa.from('profiles').update({ welcomed_at: new Date().toISOString() }).eq('id', userId);
  } catch (err) {
    // não bloqueia o verify; loga e segue
    const supa = createClient();
    await supa.from('system_logs').insert({
      level: 'warn', source: 'api/otp/verify', event: 'welcome_failed',
      user_id: userId, error_message: (err as Error).message
    });
  }
}

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
    .select('whatsapp_otp, whatsapp_otp_expires_at, whatsapp_phone, welcomed_at')
    .eq('id', user.id)
    .single();

  if (!profile?.whatsapp_otp) return NextResponse.json({ error: 'Nenhum código pendente. Solicite novamente.' }, { status: 400 });
  if (new Date(profile.whatsapp_otp_expires_at!) < new Date()) return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 });
  if (profile.whatsapp_otp !== otp) return NextResponse.json({ error: 'Código não confere.' }, { status: 400 });

  await supa.from('profiles').update({
    whatsapp_verified: true,
    whatsapp_otp: null,
    whatsapp_otp_expires_at: null
  }).eq('id', user.id);

  // dispara welcome (não bloqueante mas aguarda no Edge runtime)
  if (!profile.welcomed_at && profile.whatsapp_phone) {
    await tryWelcomeMessage(user.id, profile.whatsapp_phone);
  }

  return NextResponse.json({ ok: true });
}
