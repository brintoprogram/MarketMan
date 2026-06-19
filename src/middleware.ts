import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Roda só nas rotas que de fato precisam de sessão.
// A landing (/) e arquivos estáticos passam direto, sem invocar Supabase.
export const config = {
  matcher: ['/dashboard/:path*', '/alerts/:path*', '/onboarding/:path*', '/login']
};
