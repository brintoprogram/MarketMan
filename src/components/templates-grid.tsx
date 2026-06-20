'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TEMPLATES, type Template } from '@/lib/templates';
import { Sparkles, Bell, CalendarClock, Check, AlertCircle } from 'lucide-react';

export function TemplatesGrid() {
  const router = useRouter();
  const [applying, setApplying] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);

  async function apply(template: Template) {
    setApplying(template.id); setFeedback(null);
    const res = await fetch('/api/templates/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: template.id })
    });
    const data = await res.json();
    setApplying(null); setConfirmId(null);
    if (!res.ok) { setFeedback({ kind: 'error', msg: data.error ?? 'Falha' }); return; }
    setFeedback({ kind: 'ok', msg: `Criado: ${data.alerts_created} alertas + ${data.reports_created} relatório${data.reports_created === 1 ? '' : 's'}` });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-soft ${feedback.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {feedback.kind === 'ok' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {TEMPLATES.map((t) => {
          const isConfirming = confirmId === t.id;
          const isApplying = applying === t.id;
          return (
            <Card key={t.id} className="card-hover overflow-hidden">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl ring-1 ring-inset ring-brand-200/60">
                      {t.emoji}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-zinc-900">{t.title}</h3>
                      <p className="font-mono text-xs text-zinc-500">{t.subtitle}</p>
                    </div>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-zinc-600">{t.description}</p>

                <div className="mb-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200/60">
                    <Bell className="h-3 w-3" />{t.alerts.length} alerta{t.alerts.length === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700 ring-1 ring-inset ring-brand-200/60">
                    <CalendarClock className="h-3 w-3" />{t.reports.length} relatório{t.reports.length === 1 ? '' : 's'}
                  </span>
                </div>

                {!isConfirming ? (
                  <Button variant="brand" className="w-full" onClick={() => setConfirmId(t.id)} disabled={!!applying}>
                    <Sparkles className="h-4 w-4" />Aplicar template
                  </Button>
                ) : (
                  <div className="space-y-2 rounded-xl border border-amber-200/60 bg-amber-50/40 p-3">
                    <p className="text-xs text-amber-900">
                      Vamos criar {t.alerts.length} alertas + {t.reports.length} relatório no seu perfil.
                      Você pode editar tudo depois.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="brand" size="sm" className="flex-1" onClick={() => apply(t)} disabled={isApplying}>
                        {isApplying ? 'Aplicando...' : 'Confirmar'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setConfirmId(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
