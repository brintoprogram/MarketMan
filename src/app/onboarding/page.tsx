'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { MessageCircle, ArrowLeft } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Falha ao enviar código'); return; }
    setStep('otp');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Código inválido'); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-mesh px-6 py-12">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-radial-fade pointer-events-none" />
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 flex items-center justify-center">
          <Logo size="md" />
        </div>
        <Card className="shadow-elevated">
          <CardHeader>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
              <MessageCircle className="h-5 w-5" />
            </div>
            <CardTitle>
              {step === 'phone' ? 'Conecte seu WhatsApp' : 'Confirme o código'}
            </CardTitle>
            <CardDescription>
              {step === 'phone'
                ? 'Vamos enviar seus alertas pelo WhatsApp. Confirma o número.'
                : `Enviamos um código de 6 dígitos pra ${phone}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'phone' ? (
              <form onSubmit={sendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Número do WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <p className="text-xs text-zinc-500">DDD + número. Sem precisar do +55.</p>
                </div>
                {error && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                )}
                <Button type="submit" variant="brand" className="w-full" disabled={loading} size="lg">
                  {loading ? 'Enviando...' : 'Enviar código no WhatsApp'}
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Código de 6 dígitos</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    className="text-center text-2xl tracking-[0.6em] font-mono"
                  />
                </div>
                {error && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                )}
                <Button type="submit" variant="brand" className="w-full" disabled={loading || otp.length !== 6} size="lg">
                  {loading ? 'Verificando...' : 'Confirmar'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); setError(null); }}
                  className="inline-flex w-full items-center justify-center gap-1.5 text-center text-sm text-zinc-500 transition hover:text-zinc-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Mudar número
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
