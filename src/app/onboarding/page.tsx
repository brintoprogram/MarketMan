'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { toast } from '@/components/ui/toast';
import { MessageCircle, ArrowLeft } from 'lucide-react';

type Step = 'phone' | 'otp';

function maskPhoneBR(raw: string): string {
  const digits = raw.replace(/\D+/g, '').slice(0, 11);
  if (digits.length <= 2)  return digits;
  if (digits.length <= 7)  return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error('Não consegui enviar', data.error ?? 'Falha ao enviar código');
      return;
    }
    toast.success('Código enviado', `Mandamos no WhatsApp ${phone}`);
    setStep('otp');
    requestAnimationFrame(() => otpRefs.current[0]?.focus());
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: code })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error('Código inválido', data.error ?? 'Tente de novo');
      return;
    }
    toast.success('WhatsApp verificado', 'Tudo pronto pra receber alertas.');
    router.push('/dashboard');
    router.refresh();
  }

  function handleOtpChange(idx: number, v: string) {
    const digit = v.replace(/\D+/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D+/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const arr = pasted.split('').concat(Array(6 - pasted.length).fill(''));
    setOtp(arr);
    const lastIdx = Math.min(pasted.length, 5);
    otpRefs.current[lastIdx]?.focus();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-5 py-12">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex items-center justify-center">
          <Logo size="md" />
        </div>

        <div className="rounded-xl border border-line bg-panel p-6 shadow-card animate-fade-up">
          {/* Stepper */}
          <div className="mb-5 flex items-center justify-center gap-2">
            <Step n={1} active={step === 'phone'} done={step === 'otp'} />
            <div className={`h-px w-12 transition ${step === 'otp' ? 'bg-brand' : 'bg-line-strong'}`} />
            <Step n={2} active={step === 'otp'} done={false} />
          </div>

          <div className="mb-1.5 inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
            <MessageCircle className="h-4 w-4" />
          </div>
          <h1 className="text-[20px] font-bold leading-tight tracking-[-0.02em] text-ink">
            {step === 'phone' ? 'Conecte seu WhatsApp' : 'Confirme o código'}
          </h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
            {step === 'phone'
              ? 'Vamos enviar seus alertas pelo WhatsApp. Confirma o número.'
              : <>Enviamos um código de 6 dígitos pra <span className="num font-medium text-ink">{phone}</span>.</>}
          </p>

          {step === 'phone' ? (
            <form onSubmit={sendOtp} className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Número do WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                  required
                  className="num"
                />
                <p className="text-[11px] text-ink-3">DDD + número. Sem precisar do +55.</p>
              </div>
              <Button type="submit" variant="brand" className="w-full" disabled={loading || phone.replace(/\D+/g, '').length < 10}>
                {loading ? 'Enviando…' : 'Enviar código no WhatsApp'}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="mt-5 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="otp-0">Código de 6 dígitos</Label>
                <div className="flex justify-between gap-1.5">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="num h-12 w-full max-w-[52px] rounded-md border border-line-strong bg-panel text-center text-[20px] font-semibold text-ink shadow-[inset_0_1px_0_rgba(0,0,0,.02)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
                <p className="text-[11px] text-ink-3">Cole o código todo no primeiro campo se preferir.</p>
              </div>

              <Button type="submit" variant="brand" className="w-full" disabled={loading || otp.join('').length !== 6}>
                {loading ? 'Verificando…' : 'Confirmar'}
              </Button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }}
                className="inline-flex w-full items-center justify-center gap-1.5 text-center text-[12px] font-medium text-ink-3 transition hover:text-ink"
              >
                <ArrowLeft className="h-3 w-3" />
                Mudar número
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function Step({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span
      className={`num inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition ${
        done   ? 'bg-brand text-white'
        : active ? 'bg-brand-soft text-brand-ink ring-2 ring-brand'
        : 'bg-panel-2 text-ink-3'
      }`}
      aria-current={active ? 'step' : undefined}
    >
      {n}
    </span>
  );
}
