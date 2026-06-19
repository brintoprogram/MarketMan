'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coffee, MessageCircle } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Falha ao enviar código');
      return;
    }
    setStep('otp');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Código inválido');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold">
          <Coffee className="h-5 w-5 text-emerald-600" />
          MarketMan
        </div>
        <Card>
          <CardHeader>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <MessageCircle className="h-5 w-5" />
            </div>
            <CardTitle>
              {step === 'phone' ? 'Conecte seu WhatsApp' : 'Confirme o código'}
            </CardTitle>
            <CardDescription>
              {step === 'phone'
                ? 'Vamos te enviar os alertas pelo WhatsApp. Confirma o número aqui.'
                : `Enviamos um código de 6 dígitos pro ${phone}.`}
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
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <Button type="submit" variant="brand" className="w-full" disabled={loading}>
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
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <Button type="submit" variant="brand" className="w-full" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verificando...' : 'Confirmar'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); setError(null); }}
                  className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700"
                >
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
