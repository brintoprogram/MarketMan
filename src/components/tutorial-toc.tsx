'use client';

import { useEffect, useState } from 'react';

interface Section { id: string; label: string; }

interface Props { sections: Section[]; }

export function TutorialTOC({ sections }: Props) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        // pega o que está mais perto do topo entre os visíveis
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((best, e) =>
          (e.boundingClientRect.top < best.boundingClientRect.top ? e : best)
        );
        setActive(top.target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: [0, 0.5, 1] }
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Índice" className="sticky top-[80px] hidden self-start lg:block">
      <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-3">
        Neste guia
      </div>
      <ul className="space-y-0.5 border-l border-line">
        {sections.map((s, i) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(s.id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.replaceState(null, '', `#${s.id}`);
                    setActive(s.id);
                  }
                }}
                className={`relative -ml-px flex items-center gap-2 border-l-2 py-1.5 pl-3 pr-2 text-[12.5px] transition ${
                  isActive
                    ? 'border-brand text-brand-ink font-medium'
                    : 'border-transparent text-ink-2 hover:text-ink'
                }`}
              >
                <span className="num w-5 text-[10px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
