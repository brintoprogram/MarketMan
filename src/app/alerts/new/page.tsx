import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { AlertForm } from '@/components/alert-form';

export const dynamic = 'force-dynamic';

export default async function NewAlertPage({ searchParams }: { searchParams: { asset?: string; threshold?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit')
    .eq('active', true)
    .order('display_order');

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-2xl px-6 py-10">
          <div className="animate-fade-up">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Novo alerta</div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Configura um alerta</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Escolha o ativo, a variação mínima pra disparar e o período de comparação.
            </p>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-2xl px-6 py-10 animate-fade-up-delay-1">
        <AlertForm
          assets={assets ?? []}
          preselectedAssetId={searchParams.asset}
          preselectedThreshold={searchParams.threshold}
        />
      </main>
    </div>
  );
}
