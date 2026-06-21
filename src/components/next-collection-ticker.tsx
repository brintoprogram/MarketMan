'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** Minutos do intervalo do cron (ex: 15, 60, 1440). */
  intervalMinutes: number;
  /** Timestamp da última coleta (ISO). Quando passado, mostra "agora · próxima em mm:ss". */
  lastFetchedAt?: string | null;
}

/**
 * Mostra "Última coleta agora · próxima em mm:ss".
 * Calcula a próxima execução baseando-se no minuto atual:
 *   - se intervalMinutes < 60: próximo múltiplo de N minutos (ex: 15 → :00, :15, :30, :45)
 *   - se intervalMinutes >= 60: próxima hora arredondada
 */
export function NextCollectionTicker({ intervalMinutes, lastFetchedAt }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;

  const next = computeNext(now, intervalMinutes);
  const diffMs = Math.max(0, next.getTime() - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');

  const ageMs = lastFetchedAt ? now.getTime() - new Date(lastFetchedAt).getTime() : null;
  const ageLabel = ageMs == null ? '—' : ageMs < 60_000 ? 'agora' : relativeMin(ageMs);

  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-ink-2">
      <span className="dot-active" aria-hidden />
      <span>Última coleta <span className="num text-ink">{ageLabel}</span></span>
      <span className="text-ink-3">·</span>
      <span>próxima em <span className="num text-ink">{mm}:{ss}</span></span>
    </span>
  );
}

function computeNext(now: Date, intervalMinutes: number): Date {
  const next = new Date(now);
  next.setSeconds(0, 0);

  if (intervalMinutes <= 0) return next;

  if (intervalMinutes < 60) {
    const m = next.getMinutes();
    const remainder = m % intervalMinutes;
    const add = remainder === 0 && now.getSeconds() === 0 ? 0 : intervalMinutes - remainder;
    next.setMinutes(m + add);
    return next;
  }

  // intervalo em horas
  const hours = Math.round(intervalMinutes / 60);
  next.setMinutes(0);
  const h = next.getHours();
  const remainder = h % hours;
  const add = remainder === 0 && now.getMinutes() === 0 && now.getSeconds() === 0 ? 0 : hours - remainder;
  next.setHours(h + add);
  return next;
}

function relativeMin(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}
