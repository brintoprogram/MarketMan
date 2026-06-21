import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { AlertForm } from '@/components/alert-form';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewAlertPage({
  searchParams
}: {
  searchParams: { asset?: string; threshold?: string; target?: string; direction?: 'above' | 'below' | 'crosses' };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assets } = await supabase
    .from('assets')
    .select('id, symbol, name, category, unit')
    .eq('active', true)
    .order('display_order');

  const { data: recipients } = await supabase
    .from('recipients')
    .select('id, name, phone, is_self')
    .eq('user_id', user.id)
    .eq('verified', true)
    .order('is_self', { ascending: false });

  // Último preço por ativo + preço 7d atrás (pra alimentar a prévia do WhatsApp)
  const assetIds = (assets ?? []).map((a) => a.id);
  const latestByAsset: Record<string, { price: number; prevPrice?: number | null }> = {};
  if (assetIds.length) {
    const { data: recentQuotes } = await supabase
      .from('quotes')
      .select('asset_id, price, fetched_at')
      .in('asset_id', assetIds)
      .gte('fetched_at', new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString())
      .order('fetched_at', { ascending: false });

    const sevenDaysAgoMs = Date.now() - 7 * 24 * 3600 * 1000;
    for (const q of recentQuotes ?? []) {
      const aid = q.asset_id;
      if (!latestByAsset[aid]) {
        latestByAsset[aid] = { price: Number(q.price) };
      } else if (latestByAsset[aid].prevPrice == null) {
        const t = new Date(q.fetched_at).getTime();
        if (t <= sevenDaysAgoMs) latestByAsset[aid].prevPrice = Number(q.price);
      }
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <Link
            href="/alerts"
            className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar pra alertas
          </Link>
          <div className="animate-fade-up">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
              Novo alerta
            </div>
            <h1 className="text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[36px]">
              Configura um alerta
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-2">
              Escolha o ativo, defina o gatilho e edite a mensagem. A prévia à direita
              mostra como vai chegar no WhatsApp — com valores reais do ativo.
            </p>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-8 animate-fade-up-delay-1">
        <AlertForm
          assets={assets ?? []}
          recipients={(recipients ?? []) as any}
          latestByAsset={latestByAsset}
          preselectedAssetId={searchParams.asset}
          preselectedThreshold={searchParams.threshold}
          preselectedTarget={searchParams.target}
          preselectedTargetDirection={searchParams.direction}
        />
      </main>
    </div>
  );
}
