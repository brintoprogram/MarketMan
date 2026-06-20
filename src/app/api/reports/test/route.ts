import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SEND_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-scheduled-reports`;

export async function POST(request: Request) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const reportId = body?.report_id as string | undefined;
  if (!reportId) return NextResponse.json({ error: 'report_id obrigatório' }, { status: 400 });

  // confere ownership
  const { data: report } = await supa.from('scheduled_reports').select('id').eq('id', reportId).eq('user_id', user.id).maybeSingle();
  if (!report) return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 });

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });

  try {
    const res = await fetch(SEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, kind: 'test' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: data?.error ?? `Edge ${res.status}` }, { status: 502 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
