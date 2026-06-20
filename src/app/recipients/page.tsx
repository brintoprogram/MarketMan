import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { RecipientsManager } from '@/components/recipients-manager';

export const dynamic = 'force-dynamic';

export default async function RecipientsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: recipients } = await supabase
    .from('recipients')
    .select('id, name, phone, verified, is_self, created_at')
    .eq('user_id', user.id)
    .order('is_self', { ascending: false })
    .order('created_at', { ascending: true });

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-10">
          <div className="animate-fade-up">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Destinatários</div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Quem recebe seus alertas</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Cadastre múltiplos números pra distribuir alertas e relatórios pra uma equipe, cooperativa ou corretora.
              Cada novo número precisa confirmar um código OTP no próprio WhatsApp.
            </p>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-4xl px-6 py-10 animate-fade-up-delay-1">
        <RecipientsManager initial={(recipients ?? []) as any} />
      </main>
    </div>
  );
}
