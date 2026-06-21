'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toast';
import { CATEGORY_DOT } from '@/components/asset-card';
import { Sliders, X, ArrowUp, ArrowDown, Search, RotateCcw, Plus } from 'lucide-react';

export interface CustomizerAsset {
  id: string;
  symbol: string;
  name: string;
  category: string;
  unit: string | null;
}

interface Props {
  allAssets: CustomizerAsset[];
  initialSelection: string[];   // [] = mostrar todos
}

export function DashboardCustomizer({ allAssets, initialSelection }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<string[]>(initialSelection);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // sync se prop muda (ex: rota recarrega)
  useEffect(() => { setSelection(initialSelection); }, [initialSelection]);

  // bloqueia scroll do body quando aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const byId = useMemo(() => new Map(allAssets.map((a) => [a.id, a])), [allAssets]);
  const selectedAssets = useMemo(
    () => selection.map((id) => byId.get(id)).filter(Boolean) as CustomizerAsset[],
    [selection, byId]
  );
  const availableAssets = useMemo(() => {
    const sel = new Set(selection);
    const q = search.toLowerCase().trim();
    return allAssets.filter((a) => {
      if (sel.has(a.id)) return false;
      if (!q) return true;
      return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    });
  }, [allAssets, selection, search]);

  function add(id: string) {
    setSelection((prev) => prev.includes(id) ? prev : [...prev, id]);
  }
  function remove(id: string) {
    setSelection((prev) => prev.filter((x) => x !== id));
  }
  function move(idx: number, dir: -1 | 1) {
    setSelection((prev) => {
      const next = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= next.length) return prev;
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }
  function reset() {
    setSelection([]);
  }
  function selectAll() {
    setSelection(allAssets.map((a) => a.id));
  }

  async function save() {
    setSaving(true);
    const supa = createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { setSaving(false); toast.error('Sessão expirada', 'Faça login de novo'); return; }
    const { error } = await supa.from('profiles')
      .update({ dashboard_asset_ids: selection })
      .eq('id', user.id);
    setSaving(false);
    if (error) { toast.error('Não consegui salvar', error.message); return; }
    toast.success(
      selection.length === 0 ? 'Mostrando todos os ativos' : `${selection.length} ativos no dashboard`,
      selection.length === 0 ? 'Ordem padrão restaurada.' : 'A ordem foi salva.'
    );
    setOpen(false);
    router.refresh();
  }

  const previewDirty = JSON.stringify(selection) !== JSON.stringify(initialSelection);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Personalizar dashboard"
      >
        <Sliders className="h-3.5 w-3.5" />
        Personalizar
      </Button>

      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-fade-up"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Sheet à direita */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-customizer-title"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-line bg-panel shadow-card animate-fade-up"
          >
            {/* Header */}
            <header className="border-b border-line px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
                    Dashboard
                  </div>
                  <h2 id="dash-customizer-title" className="mt-1 text-[20px] font-bold leading-tight tracking-[-0.02em] text-ink">
                    Personalizar cards
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition hover:bg-panel-2 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
                Escolha quais ativos aparecem e em qual ordem. Deixe a lista vazia pra mostrar todos
                no padrão.
              </p>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Selecionados */}
              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
                    No seu dashboard
                  </div>
                  <div className="num text-[10.5px] text-ink-3">
                    {selectedAssets.length === 0
                      ? <>vazio · <span className="text-ink-2">vai mostrar todos</span></>
                      : <>{selectedAssets.length} card{selectedAssets.length === 1 ? '' : 's'}</>}
                  </div>
                </div>
                {selectedAssets.length === 0 ? (
                  <div className="rounded-md border border-dashed border-line-strong bg-panel-2/40 p-5 text-center">
                    <p className="text-[12px] text-ink-3">
                      Lista vazia = comportamento padrão (mostra <strong className="text-ink-2">todos</strong> os ativos).
                    </p>
                    <button
                      type="button"
                      onClick={selectAll}
                      className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-ink hover:underline"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar todos pra começar a editar
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {selectedAssets.map((a, idx) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 rounded-md border border-line bg-panel-2/50 px-2.5 py-2"
                      >
                        <span className="num inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-panel text-[10.5px] font-medium text-ink-3">
                          {idx + 1}
                        </span>
                        <span
                          className="inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full"
                          style={{ background: CATEGORY_DOT[a.category] ?? 'var(--ink-3)' }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[12.5px]">
                            <code className="num text-[10.5px] font-medium uppercase tracking-wider text-ink-3">{a.symbol}</code>
                            <span className="truncate font-medium text-ink">{a.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <ArrowBtn onClick={() => move(idx, -1)} disabled={idx === 0} aria="Mover pra cima">
                            <ArrowUp className="h-3 w-3" />
                          </ArrowBtn>
                          <ArrowBtn onClick={() => move(idx, 1)} disabled={idx === selectedAssets.length - 1} aria="Mover pra baixo">
                            <ArrowDown className="h-3 w-3" />
                          </ArrowBtn>
                          <button
                            type="button"
                            onClick={() => remove(a.id)}
                            aria-label="Remover"
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-3 transition hover:bg-down-soft hover:text-down"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Disponíveis */}
              <section className="mt-6">
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                    Disponíveis
                  </div>
                  <div className="num text-[10.5px] text-ink-3">{availableAssets.length}</div>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-3" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar ativo (ICF, café, dólar…)"
                    className="pl-7 text-[12.5px]"
                  />
                </div>
                {availableAssets.length === 0 ? (
                  <p className="rounded-md border border-line bg-panel-2/40 px-3 py-3 text-center text-[11.5px] text-ink-3">
                    {search ? 'Nada com esse termo.' : 'Todos os ativos já estão no seu dashboard.'}
                  </p>
                ) : (
                  <ul className="overflow-hidden rounded-md border border-line bg-panel">
                    {availableAssets.map((a) => (
                      <li key={a.id} className="border-b border-line last:border-0">
                        <button
                          type="button"
                          onClick={() => add(a.id)}
                          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition hover:bg-brand-soft/60"
                        >
                          <span
                            className="inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full"
                            style={{ background: CATEGORY_DOT[a.category] ?? 'var(--ink-3)' }}
                            aria-hidden
                          />
                          <code className="num text-[10.5px] font-medium uppercase tracking-wider text-ink-3">
                            {a.symbol}
                          </code>
                          <span className="truncate text-[12.5px] font-medium text-ink">{a.name}</span>
                          {a.unit && (
                            <span className="num ml-auto text-[10.5px] text-ink-3">{a.unit}</span>
                          )}
                          <Plus className="ml-1 h-3 w-3 flex-shrink-0 text-ink-3 transition group-hover:text-brand-ink" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-between gap-2 border-t border-line bg-panel-2/40 px-5 py-3.5">
              <button
                type="button"
                onClick={reset}
                disabled={selection.length === 0}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-3 transition hover:text-ink disabled:opacity-40"
                title="Voltar pro padrão (mostrar todos)"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar padrão
              </button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button variant="brand" size="sm" onClick={save} disabled={saving || !previewDirty}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </footer>
          </aside>
        </>
      )}
    </>
  );
}

function ArrowBtn({
  onClick, disabled, children, aria
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; aria: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-3 transition hover:bg-panel hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-3"
    >
      {children}
    </button>
  );
}
