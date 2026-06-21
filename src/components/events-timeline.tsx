// Timeline compacta de eventos do sistema (sidebar).
// Dot colorido por nível + label + timestamp mono.

import { relativeTime } from '@/lib/format';

interface EventRow {
  id: number | string;
  level: 'debug' | 'info' | 'warn' | 'error' | string;
  event: string;
  error_message?: string | null;
  response_status?: number | null;
  duration_ms?: number | null;
  created_at: string;
}

const levelDot: Record<string, string> = {
  error: 'bg-down',
  warn:  'bg-[#F59E0B]',
  info:  'bg-brand',
  debug: 'bg-line-strong'
};

const levelText: Record<string, string> = {
  error: 'text-down',
  warn:  'text-[#B45309]',
  info:  'text-ink',
  debug: 'text-ink-3'
};

export function EventsTimeline({ events }: { events: EventRow[] }) {
  if (events.length === 0) {
    return <p className="px-1 py-4 text-center text-[12px] text-ink-3">Sem eventos ainda.</p>;
  }

  return (
    <ol className="relative">
      <div className="absolute bottom-1 left-[5px] top-1 w-px bg-line" aria-hidden />
      {events.map((e) => {
        const dotCls = levelDot[e.level] ?? 'bg-line-strong';
        const txtCls = levelText[e.level] ?? 'text-ink';
        return (
          <li key={e.id} className="relative flex items-start gap-2.5 py-2 pl-0">
            <span className={`relative z-10 mt-1.5 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ring-4 ring-panel ${dotCls}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`truncate text-[12px] font-medium ${txtCls}`}>{e.event}</span>
                <span className="num text-[10px] text-ink-3">{relativeTime(e.created_at)}</span>
              </div>
              {e.error_message && (
                <p className="mt-0.5 truncate text-[11px] text-down" title={e.error_message}>
                  {e.error_message}
                </p>
              )}
              {(e.response_status || e.duration_ms) && (
                <p className="num text-[10px] text-ink-3">
                  {e.response_status != null && <>HTTP {e.response_status}</>}
                  {e.response_status != null && e.duration_ms != null && ' · '}
                  {e.duration_ms != null && <>{e.duration_ms}ms</>}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
