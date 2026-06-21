'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

/**
 * Sistema de Toast simples sem dependência externa.
 * Uso:
 *   import { toast } from '@/components/ui/toast';
 *   toast.success('Alerta criado');
 *   toast.error('Falha ao salvar', 'A API retornou 502');
 *   toast.info({ title: 'Atualizando...', duration: 2000 });
 *
 * No <body>, deve haver um <Toaster /> uma vez (já em layout.tsx).
 */

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms; 0 = persistente
}

type Listener = (action: { type: 'add' | 'remove'; toast: ToastItem }) => void;
const listeners: Listener[] = [];
let counter = 0;

function emit(action: { type: 'add' | 'remove'; toast: ToastItem }) {
  listeners.forEach((l) => l(action));
}

function show(input: Omit<ToastItem, 'id'>): string {
  const id = String(++counter);
  const item: ToastItem = { duration: 4000, variant: 'info', ...input, id };
  emit({ type: 'add', toast: item });
  return id;
}

export const toast = Object.assign(
  (input: Omit<ToastItem, 'id'>) => show(input),
  {
    success: (title: string, description?: string) =>
      show({ title, description, variant: 'success' }),
    error: (title: string, description?: string) =>
      show({ title, description, variant: 'error' }),
    info: (title: string, description?: string) =>
      show({ title, description, variant: 'info' }),
    dismiss: (id: string) => emit({ type: 'remove', toast: { id } as ToastItem })
  }
);

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (action) => {
      if (action.type === 'add') {
        const t = action.toast;
        setItems((prev) => [...prev, t]);
        if (t.duration && t.duration > 0) {
          setTimeout(() => {
            setItems((prev) => prev.filter((p) => p.id !== t.id));
          }, t.duration);
        }
      } else {
        setItems((prev) => prev.filter((p) => p.id !== action.toast.id));
      }
    };
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={() => setItems((p) => p.filter((x) => x.id !== t.id))} />
      ))}
    </div>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const v = item.variant ?? 'info';
  const Icon = v === 'success' ? CheckCircle2 : v === 'error' ? AlertCircle : Info;
  const iconColor =
    v === 'success' ? 'text-up' : v === 'error' ? 'text-down' : 'text-ink-2';
  // Borda à esquerda colorida pra reforçar variante sem inundar a superfície
  const borderColor =
    v === 'success' ? 'before:bg-up' : v === 'error' ? 'before:bg-down' : 'before:bg-ink-3';

  return (
    <div
      role="status"
      className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg border border-line bg-panel-2 p-3 pr-2 shadow-card animate-fade-up
        before:absolute before:inset-y-0 before:left-0 before:w-[3px] ${borderColor}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        {item.title && <p className="text-[13px] font-semibold text-ink leading-tight">{item.title}</p>}
        {item.description && (
          <p className="mt-0.5 text-[12px] leading-snug text-ink-2">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar"
        className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-ink-3 hover:bg-brand-soft hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
