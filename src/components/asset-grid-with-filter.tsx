'use client';

import { useMemo, useState } from 'react';
import { AssetCard, AssetCardEmpty, type AssetCardData } from '@/components/asset-card';
import { SegmentedFilter } from '@/components/segmented-filter';

interface Props {
  cards: AssetCardData[];
}

type FilterKey = 'all' | 'commodity' | 'currency' | 'index' | 'crypto';

export function AssetGridWithFilter({ cards }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const counts = useMemo(() => {
    const c = { all: cards.length, commodity: 0, currency: 0, index: 0, crypto: 0 } as Record<FilterKey, number>;
    for (const x of cards) {
      const cat = x.category as FilterKey;
      if (cat in c) c[cat] += 1;
      // 'stock' agrupado com 'index'
      if (x.category === 'stock') c.index += 1;
    }
    return c;
  }, [cards]);

  const filtered = useMemo(() => {
    if (filter === 'all') return cards;
    if (filter === 'index') return cards.filter((c) => c.category === 'index' || c.category === 'stock');
    return cards.filter((c) => c.category === filter);
  }, [cards, filter]);

  const options = [
    { value: 'all',       label: 'Todos',      count: counts.all },
    { value: 'commodity', label: 'Commodity',  count: counts.commodity },
    { value: 'currency',  label: 'Moeda',      count: counts.currency },
    { value: 'index',     label: 'Índice',     count: counts.index },
    ...(counts.crypto > 0 ? [{ value: 'crypto', label: 'Cripto', count: counts.crypto }] : [])
  ];

  return (
    <>
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Acompanhamento</h2>
          <span className="num text-[12px] text-ink-3">{filtered.length}</span>
        </div>
        <SegmentedFilter
          options={options}
          value={filter}
          onChange={(v) => setFilter(v as FilterKey)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c, idx) =>
          c.price != null && Number.isFinite(c.price) ? (
            <div key={c.id} className="animate-fade-up" style={{ animationDelay: `${(idx % 6) * 30}ms` }}>
              <AssetCard data={c} href={`/dashboard/assets/${c.id}`} />
            </div>
          ) : (
            <div key={c.id} className="animate-fade-up" style={{ animationDelay: `${(idx % 6) * 30}ms` }}>
              <AssetCardEmpty
                href={`/dashboard/assets/${c.id}`}
                symbol={c.symbol}
                name={c.name}
                category={c.category}
                unit={c.unit}
              />
            </div>
          )
        )}
      </div>
    </>
  );
}
