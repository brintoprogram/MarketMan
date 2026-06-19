'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Beaker, Check, AlertCircle, RefreshCw } from 'lucide-react';

export function TestAssetButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setState('loading'); setMsg(null);
    try {
      const res = await fetch(`/api/test-asset/${assetId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMsg(data.error ?? 'Falha');
        setTimeout(() => { setState('idle'); setMsg(null); }, 5000);
        return;
      }
      const result = data.results?.[0];
      if (result?.ok) {
        setState('ok');
        setMsg(`Preço: ${result.price}`);
      } else {
        setState('error');
        setMsg(result?.error ?? 'sem dados');
      }
      router.refresh();
      setTimeout(() => { setState('idle'); setMsg(null); }, 4000);
    } catch (err) {
      setState('error');
      setMsg((err as Error).message);
      setTimeout(() => { setState('idle'); setMsg(null); }, 5000);
    }
  }

  const icon = state === 'loading' ? <RefreshCw className="h-4 w-4 animate-spin" />
    : state === 'ok' ? <Check className="h-4 w-4" />
    : state === 'error' ? <AlertCircle className="h-4 w-4" />
    : <Beaker className="h-4 w-4" />;

  const label = state === 'loading' ? 'Testando...'
    : state === 'ok' ? msg ?? 'OK'
    : state === 'error' ? msg ?? 'Erro'
    : 'Testar fetch';

  const variant = state === 'ok' ? 'brand' : state === 'error' ? 'destructive' : 'outline';

  return <Button onClick={run} disabled={state === 'loading'} variant={variant}>{icon}{label}</Button>;
}
