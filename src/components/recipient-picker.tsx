'use client';

import Link from 'next/link';
import { Users, Plus } from 'lucide-react';

export interface RecipientOption {
  id: string;
  name: string;
  phone: string;
  is_self: boolean;
}

interface Props {
  recipients: RecipientOption[];
  value: string[];     // [] = self (default)
  onChange: (ids: string[]) => void;
}

export function RecipientPicker({ recipients, value, onChange }: Props) {
  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  }

  // se value vazio: mostra "Apenas você" (default)
  const isDefault = value.length === 0;
  const selfRecipient = recipients.find((r) => r.is_self);

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {/* opção default (self) */}
        {selfRecipient && (
          <button
            type="button"
            onClick={() => onChange([])}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
              isDefault ? 'border-brand-400 bg-brand-50/40 ring-2 ring-brand-500/20' : 'border-zinc-200 bg-white hover:bg-zinc-50'
            }`}
          >
            <div>
              <div className="font-semibold text-zinc-900">Apenas você</div>
              <div className="text-xs text-zinc-500">+{selfRecipient.phone}</div>
            </div>
            {isDefault && <span className="text-xs font-semibold text-brand-700">Padrão</span>}
          </button>
        )}

        {recipients.filter((r) => !r.is_self).length > 0 && (
          <>
            <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Ou múltiplos destinatários</div>
            {recipients.filter((r) => !r.is_self).map((r) => {
              const sel = value.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggle(r.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                    sel ? 'border-brand-400 bg-brand-50/40 ring-2 ring-brand-500/20' : 'border-zinc-200 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input type="checkbox" readOnly checked={sel} className="rounded text-brand-600" />
                    <div>
                      <div className="font-semibold text-zinc-900">{r.name}</div>
                      <div className="text-xs text-zinc-500">+{r.phone}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
      <Link href="/recipients" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
        <Plus className="h-3 w-3" />Adicionar destinatário
      </Link>
    </div>
  );
}
