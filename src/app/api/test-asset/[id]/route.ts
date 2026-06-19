import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FETCH_QUOTES_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-quotes`;

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });

  try {
    const res = await fetch(FETCH_QUOTES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'manual-asset-test', asset_id: params.id })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.error ?? `Edge function ${res.status}`, full: data }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
