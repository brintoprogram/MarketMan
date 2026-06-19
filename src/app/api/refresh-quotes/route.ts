import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const FETCH_QUOTES_URL = `${SUPA_URL}/functions/v1/fetch-quotes`;
const BACKFILL_URL = `${SUPA_URL}/functions/v1/backfill-historical`;

export async function POST(request: Request) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon || !SUPA_URL) return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });

  // ?mode=backfill → puxa 30d de histórico (mais devagar mas completo)
  // sem param → fetch-quotes (rápido, só preço atual)
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');

  const targetUrl = mode === 'backfill' ? BACKFILL_URL : FETCH_QUOTES_URL;
  const body = mode === 'backfill' ? { range: '1mo' } : { source: 'manual' };

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anon}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
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
      mode: mode ?? 'refresh',
      success: data.success ?? data.total_inserted,
      total: data.assets,
      duration_ms: data.duration_ms,
      results: data.results
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
