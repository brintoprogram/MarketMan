import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { relativeTime } from '@/lib/format';
import { Workflow, Plus, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FlowsList() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: flows } = await supabase
    .from('flows')
    .select('id, name, description, active, graph, last_triggered_at, trigger_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const activeCount = (flows ?? []).filter((f: any) => f.active).length;
  const total = flows?.length ?? 0;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="animate-fade-up">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
                Automação
              </div>
              <h1 className="text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[36px]">
                Fluxos visuais
              </h1>
              <p className="num mt-2 text-[12px] text-ink-3">
                <span className="text-ink">{activeCount}</span> ativos · <span className="text-ink">{total}</span> total
              </p>
              <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-ink-2">
                Crie automações visuais conectando triggers (variação, preço-alvo) a ações
                (mensagem, relatório). Tipo N8N, mas focado no mercado.
              </p>
            </div>
            <Link href="/flows/new" className="animate-fade-up-delay-1">
              <Button variant="brand" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Novo fluxo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {total === 0 ? (
          <div className="animate-fade-up rounded-xl border border-line bg-panel p-12 text-center shadow-card">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
              <Workflow className="h-5 w-5" />
            </div>
            <h3 className="mb-1 text-[15px] font-semibold text-ink">Nenhum fluxo ainda</h3>
            <p className="mx-auto mb-5 max-w-md text-[12px] leading-relaxed text-ink-2">
              Fluxos são mais flexíveis que alertas — permitem condições combinadas e várias ações
              por trigger. Comece com um modelo simples e evolua.
            </p>
            <Link href="/flows/new"><Button variant="brand" size="sm">Criar primeiro fluxo</Button></Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(flows ?? []).map((f: any, idx: number) => {
              const nodeCount = (f.graph?.nodes ?? []).length;
              const edgeCount = (f.graph?.edges ?? []).length;
              return (
                <Link
                  key={f.id}
                  href={`/flows/${f.id}`}
                  className="group card-hover block rounded-md border border-line bg-panel p-4 transition animate-fade-up"
                  style={{ animationDelay: `${Math.min(idx, 8) * 25}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex-shrink-0">
                      {f.active
                        ? <span className="dot-active" />
                        : <span className="block h-1.5 w-1.5 rounded-full bg-line-strong" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[13.5px] font-semibold text-ink">{f.name}</h3>
                      {f.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-2">{f.description}</p>
                      )}
                      <div className="num mt-1 flex items-center gap-2 text-[10.5px] text-ink-3">
                        <span>{nodeCount} nó{nodeCount === 1 ? '' : 's'}</span>
                        <span>·</span>
                        <span>{edgeCount} conexão{edgeCount === 1 ? '' : 'ões'}</span>
                        <span>·</span>
                        <span>{f.trigger_count} disparos</span>
                      </div>
                    </div>
                    <div className="hidden text-right md:block">
                      <div className="num text-[11px] text-ink-3">
                        {f.last_triggered_at ? <>último disparo {relativeTime(f.last_triggered_at)}</> : <>nunca disparou</>}
                      </div>
                    </div>
                    <ArrowRight className="hidden h-3.5 w-3.5 flex-shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-brand-ink sm:block" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
