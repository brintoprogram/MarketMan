import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { CalculatorForm } from '@/components/calculator-form';

export const dynamic = 'force-dynamic';

export default async function CalculatorPage({ searchParams }: { searchParams: { asset?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit, brapi_kind')
    .eq('active', true)
    .order('display_order');

  const assetIds = (assets ?? []).map((a) => a.id);
  const { data: latestQuotes } = await supabase
    .from('quotes')
    .select('asset_id, price, fetched_at')
    .in('asset_id', assetIds)
    .order('fetched_at', { ascending: false });

  const latestByAsset: Record<string, { price: number; fetched_at: string }> = {};
  for (const q of latestQuotes ?? []) {
    if (!latestByAsset[q.asset_id]) {
      latestByAsset[q.asset_id] = { price: Number(q.price), fetched_at: q.fetched_at };
    }
  }

  const usdAsset = (assets ?? []).find((a) => a.symbol === 'USDBRL');
  const usdBrl = usdAsset ? latestByAsset[usdAsset.id]?.price ?? null : null;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <AppNav />
      <section className="relative border-b border-zinc-200/60">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-10">
          <div className="animate-fade-up">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Ferramenta</div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Conversor de venda</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Calcule quanto vale uma operação em BRL, USD e outras unidades de mercado. Usa o preço atual ou um preço-alvo seu.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-6 py-10 animate-fade-up-delay-1">
        <CalculatorForm
          assets={assets ?? []}
          latestByAsset={latestByAsset}
          usdBrl={usdBrl}
          preselectedAssetId={searchParams.asset}
        />
      </main>
    </div>
  );
}
