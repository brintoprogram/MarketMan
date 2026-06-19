'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

export function RefreshButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleRefresh() {
    setState('loading'); setMessage(null);
    try {
      const res = await fetch('/api/refresh-quotes', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Falha na atualização');
        setTimeout(() => { setState('idle'); setMessage(null); }, 4000);
        return;
      }
      setState('ok');
      setMessage(`${data.success ?? 0} de ${data.total ?? 0} ativos atualizados`);
      router.refresh();
      setTimeout(() => { setState('idle'); setMessage(null); }, 3000);
    } catch (err) {
      setState('error');
      setMessage((err as Error).message);
      setTimeout(() => { setState('idle'); setMessage(null); }, 4000);
    }
  }

  const icon = state === 'loading'
    ? <RefreshCw className="h-4 w-4 animate-spin" />
    : state === 'ok'
      ? <Check className="h-4 w-4" />
      : state === 'error'
        ? <AlertCircle className="h-4 w-4" />
        : <RefreshCw className="h-4 w-4" />;

  const label = state === 'loading'
    ? 'Atualizando...'
    : state === 'ok'
      ? message ?? 'Atualizado'
      : state === 'error'
        ? 'Erro ao atualizar'
        : 'Atualizar agora';

  const variant = state === 'ok' ? 'brand' : state === 'error' ? 'destructive' : 'outline';

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleRefresh} disabled={state === 'loading'} variant={variant} size="lg">
        {icon}
        {label}
      </Button>
      {state === 'error' && message && (
        <span className="max-w-[280px] truncate text-xs text-rose-600" title={message}>{message}</span>
      )}
    </div>
  );
}
