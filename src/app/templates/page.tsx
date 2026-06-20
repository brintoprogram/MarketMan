import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { TemplatesGrid } from '@/components/templates-grid';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 py-10">
          <div className="animate-fade-up">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Templates</div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Configure tudo em 1 clique</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Escolha seu perfil de trader/produtor e a gente cria os alertas e o relatório diário
              com configurações de mercado já calibradas. Você pode editar depois.
            </p>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-5xl px-6 py-10 animate-fade-up-delay-1">
        <TemplatesGrid />
      </main>
    </div>
  );
}
