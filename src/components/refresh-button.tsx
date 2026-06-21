'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database } from 'lucide-react';
import { toast } from '@/components/ui/toast';

interface Props {
  showBackfill?: boolean;
}

export function RefreshButton({ showBackfill = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | 'refresh' | 'backfill'>(null);

  async function run(mode: 'refresh' | 'backfill') {
    setLoading(mode);
    try {
      const path = mode === 'backfill' ? '/api/refresh-quotes?mode=backfill' : '/api/refresh-quotes';
      const res = await fetch(path, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Falha na atualização', data.error ?? `HTTP ${res.status}`);
        return;
      }
      const total = data.total ?? '?';
      const ok = data.success ?? 0;
      if (mode === 'backfill') {
        toast.success('Histórico carregado', `${ok} pontos importados (${total} ativos)`);
      } else {
        toast.success('Cotações atualizadas', `${ok} de ${total} ativos`);
      }
      router.refresh();
    } catch (err) {
      toast.error('Erro de rede', (err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {showBackfill && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => run('backfill')}
          disabled={loading !== null}
          title="Carrega 30 dias de cotações reais (mais lento)"
        >
          <Database className="h-3.5 w-3.5" />
          Carregar histórico
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => run('refresh')}
        disabled={loading !== null}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading === 'refresh' ? 'animate-spin' : ''}`} />
        {loading === 'refresh' ? 'Atualizando' : 'Atualizar'}
      </Button>
    </div>
  );
}
