// Tabela densa de histórico de coletas.
// Mono em colunas numéricas, zebra com --line sutil, header com eyebrow mono.

import { formatPrice, relativeTime } from '@/lib/format';

interface QuoteRow {
  id: number | string;
  price: number;
  fetched_at: string;
  source?: string | null;
}

export function QuotesTable({ rows, isUsd, limit = 30 }: {
  rows: QuoteRow[];
  isUsd: boolean;
  limit?: number;
}) {
  const items = rows.slice(0, limit);
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[12px] text-ink-3">
        Nenhuma cotação ainda.
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <th className="px-4 py-2 font-semibold">Quando</th>
            <th className="px-4 py-2 font-semibold">Preço</th>
            <th className="px-4 py-2 font-semibold">Fonte</th>
            <th className="px-4 py-2 text-right font-semibold">Horário</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q, i) => (
            <tr
              key={q.id}
              className={`border-b border-line/60 ${i % 2 === 1 ? 'bg-panel-2/40' : ''} transition-colors hover:bg-brand-soft/40`}
            >
              <td className="px-4 py-2 text-[12px] text-ink-2">
                <span className="num">{relativeTime(q.fetched_at)}</span>
              </td>
              <td className="px-4 py-2">
                <span className="num text-[13px] font-medium text-ink">
                  {formatPrice(q.price, isUsd ? 'USD' : 'BRL')}
                </span>
              </td>
              <td className="px-4 py-2">
                {q.source && (
                  <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">
                    {q.source}
                  </code>
                )}
              </td>
              <td className="px-4 py-2 text-right">
                <span className="num text-[11px] text-ink-3">
                  {new Date(q.fetched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
