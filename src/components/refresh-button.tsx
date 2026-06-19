'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, AlertCircle, Database } from 'lucide-react';

interface Props {
  showBackfill?: boolean;
}

export function RefreshButton({ showBackfill = false }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'refresh' | 'backfill'>('refresh');

  async function run(targetMode: 'refresh' | 'backfill') {
    setMode(targetMode);
    setState('loading'); setMessage(null);
    try {
      const path = targetMode === 'backfill' ? '/api/refresh-quotes?mode=backfill' : '/api/refresh-quotes';
      const res = await fetch(path, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Falha na atualização');
        setTimeout(() => { setState('idle'); setMessage(null); }, 5000);
        return;
      }
      setState('ok');
      const total = data.total ?? '?';
      const ok = data.success ?? 0;
      setMessage(
        targetMode === 'backfill'
          ? `${ok} pontos históricos carregados (${total} ativos)`
          : `${ok} de ${total} ativos atualizados`
      );
      router.refresh();
      setTimeout(() => { setState('idle'); setMessage(null); }, 4000);
    } catch (err) {
      setState('error');
      setMessage((err as Error).message);
      setTimeout(() => { setState('idle'); setMessage(null); }, 5000);
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
    ? (mode === 'backfill' ? 'Carregando histórico...' : 'Atualizando...')
    : state === 'ok'
      ? message ?? 'Pronto'
      : state === 'error'
        ? 'Erro'
        : 'Atualizar agora';

  const variant = state === 'ok' ? 'brand' : state === 'error' ? 'destructive' : 'outline';

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {showBackfill && (
          <Button
            onClick={() => run('backfill')}
            disabled={state === 'loading'}
            variant="ghost"
            size="lg"
            title="Carrega 30 dias de cotações reais (mais lento)"
          >
            <Database className="h-4 w-4" />
            Carregar histórico real
          </Button>
        )}
        <Button onClick={() => run('refresh')} disabled={state === 'loading'} variant={variant} size="lg">
          {icon}
          {label}
        </Button>
      </div>
      {state === 'error' && message && (
        <span className="max-w-[320px] truncate text-xs text-rose-600" title={message}>{message}</span>
      )}
    </div>
  );
}
