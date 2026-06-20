import { type AltPrice } from '@/lib/conversions';

interface Props {
  alternates: AltPrice[];
  variant?: 'inline' | 'block';
  className?: string;
}

export function ConvertedPrice({ alternates, variant = 'inline', className }: Props) {
  if (!alternates.length) return null;

  if (variant === 'inline') {
    return (
      <div className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500 ${className ?? ''}`}>
        <span className="text-zinc-300">≈</span>
        {alternates.slice(0, 2).map((alt, i) => (
          <span key={alt.unit} className="inline-flex items-center gap-1 tabular-nums">
            <strong className="font-semibold text-zinc-700">{alt.display}</strong>
            <span className="text-zinc-400">{alt.unit}</span>
            {i < alternates.slice(0, 2).length - 1 && <span className="text-zinc-300">·</span>}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-2 sm:grid-cols-2 ${className ?? ''}`}>
      {alternates.map((alt) => (
        <div key={alt.unit} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{alt.unit}</div>
          <div className="mt-1 text-lg font-bold tabular-nums tracking-tight text-zinc-900">{alt.display}</div>
          {alt.hint && <div className="mt-0.5 text-[10px] text-zinc-400">{alt.hint}</div>}
        </div>
      ))}
    </div>
  );
}
