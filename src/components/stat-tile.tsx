import { cn } from '@/lib/utils';

interface Props {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  tag?: string;
  className?: string;
}

export function StatTile({ icon, label, value, sublabel, tag, className }: Props) {
  return (
    <div className={cn('relative rounded-xl border border-line bg-panel p-4 shadow-card', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
          <span className="text-ink-3">{icon}</span>
          {label}
        </div>
        {tag && (
          <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-3">
            {tag}
          </span>
        )}
      </div>
      <div className="mt-3 num text-[28px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </div>
      {sublabel && <div className="mt-1 text-[11px] text-ink-3">{sublabel}</div>}
    </div>
  );
}
