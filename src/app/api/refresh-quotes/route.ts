import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FETCH_QUOTES_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-quotes`;

export async function POST() {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });

  try {
    const res = await fetch(FETCH_QUOTES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anon}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ source: 'manual' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error ?? `Edge function retornou ${res.status}` },
        { status: 502 }
      );
    }
    return NextResponse.json({
      ok: true,
      success: data.success,
      total: data.assets,
      duration_ms: data.duration_ms,
      results: data.results
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
