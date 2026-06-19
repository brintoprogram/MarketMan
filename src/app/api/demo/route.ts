import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEMO_EMAIL = 'demo@marketman.app';
const DEMO_PASSWORD = 'marketman2026';

export async function GET(request: Request) {
  const supa = createClient();
  const { error } = await supa.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD
  });

  const { origin } = new URL(request.url);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Modo demo indisponível: ' + error.message)}`);
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
