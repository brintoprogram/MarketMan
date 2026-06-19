import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data: settings } = await supa.from('app_settings').select('*');
  const { data: usage } = await supa
    .from('rate_limit_usage')
    .select('*')
    .eq('date', new Date().toISOString().slice(0, 10))
    .maybeSingle();

  return NextResponse.json({
    settings: Object.fromEntries((settings ?? []).map((s) => [s.key, s.value])),
    usage_today: usage ?? { date: new Date().toISOString().slice(0, 10), count: 0, blocked_count: 0 }
  });
}

export async function POST(request: Request) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const action = body?.action as string | undefined;
  const svc = service();

  if (action === 'set_frequency') {
    const minutes = Number(body?.minutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
      return NextResponse.json({ error: 'Frequência deve estar entre 1 e 1440 minutos' }, { status: 400 });
    }
    const { data, error } = await svc.rpc('set_fetch_frequency', { p_minutes: minutes });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await svc.from('system_logs').insert({
      level: 'info', source: 'api/settings', event: 'frequency_changed',
      user_id: user.id, metadata: { minutes }, response_body: data as any
    });
    return NextResponse.json({ ok: true, applied: data });
  }

  if (action === 'set_rate_limit') {
    const enabled = Boolean(body?.enabled);
    const limit = body?.limit != null ? Number(body.limit) : null;
    if (limit != null && (!Number.isFinite(limit) || limit < 0)) {
      return NextResponse.json({ error: 'Limite inválido' }, { status: 400 });
    }
    const { data, error } = await svc.rpc('set_rate_limit', { p_enabled: enabled, p_limit: limit });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await svc.from('system_logs').insert({
      level: 'info', source: 'api/settings', event: 'rate_limit_changed',
      user_id: user.id, metadata: { enabled, limit }
    });
    return NextResponse.json({ ok: true, applied: data });
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
}
