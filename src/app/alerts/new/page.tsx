import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { AlertForm } from '@/components/alert-form';

export const dynamic = 'force-dynamic';

export default async function NewAlertPage({ searchParams }: { searchParams: { asset?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit')
    .eq('active', true)
    .order('display_order');

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-2 text-2xl font-bold">Novo alerta</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Escolha o ativo, a variação mínima pra disparar e o período de comparação.
        </p>
        <AlertForm assets={assets ?? []} preselectedAssetId={searchParams.asset} />
      </main>
    </>
  );
}
