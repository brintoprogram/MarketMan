'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Send, Check, AlertCircle, RefreshCw } from 'lucide-react';

export function TestReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setState('loading'); setMsg(null);
    try {
      const res = await fetch('/api/reports/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId })
      });
      const data = await res.json();
      if (!res.ok) {
        setState('error'); setMsg(data.error ?? 'Falha');
        setTimeout(() => { setState('idle'); setMsg(null); }, 5000); return;
      }
      const sent = data.sent?.[0];
      if (sent?.status === 'sent') { setState('ok'); setMsg('Mensagem enviada'); }
      else if (sent?.status === 'failed') { setState('error'); setMsg('Z-API falhou'); }
      else { setState('error'); setMsg('Z-API não configurado'); }
      router.refresh();
      setTimeout(() => { setState('idle'); setMsg(null); }, 4000);
    } catch (err) {
      setState('error'); setMsg((err as Error).message);
      setTimeout(() => { setState('idle'); setMsg(null); }, 5000);
    }
  }

  const icon = state === 'loading' ? <RefreshCw className="h-4 w-4 animate-spin" />
    : state === 'ok' ? <Check className="h-4 w-4" />
    : state === 'error' ? <AlertCircle className="h-4 w-4" />
    : <Send className="h-4 w-4" />;
  const label = state === 'loading' ? 'Enviando...'
    : state === 'ok' ? msg ?? 'Enviado'
    : state === 'error' ? msg ?? 'Erro'
    : 'Enviar agora';
  const variant = state === 'ok' ? 'brand' : state === 'error' ? 'destructive' : 'outline';

  return <Button onClick={run} disabled={state === 'loading'} variant={variant}>{icon}{label}</Button>;
}
