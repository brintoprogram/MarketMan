'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toast';
import { Logo } from '@/components/logo';
import { CheckCircle2, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    setLoading(false);
    if (err) { toast.error('Não consegui enviar', err.message); return; }
    setSent(true);
    toast.success('Link enviado', `Cheque ${email} (e a pasta de spam).`);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-5 py-12">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center justify-center transition-opacity hover:opacity-80">
          <Logo size="md" />
        </Link>

        <div className="rounded-xl border border-line bg-panel p-6 shadow-card animate-fade-up">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
            Acesso
          </div>
          <h1 className="mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">
            {sent ? 'Verifique seu email' : 'Entrar'}
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
            {sent
              ? 'Enviamos um link mágico no seu email. Abre lá pra continuar.'
              : 'Sem senha. Te mandamos um link de acesso direto.'}
          </p>

          {!sent ? (
            <div className="mt-5 space-y-4">
              <Link href="/api/demo">
                <Button type="button" variant="brand" className="w-full" size="default">
                  Entrar como demo (sem email)
                </Button>
              </Link>

              {/* divisória "ou" */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-panel px-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-3">
                    ou
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={loading || !email}>
                  <Mail className="h-3.5 w-3.5" />
                  {loading ? 'Enviando…' : 'Enviar magic link'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="mt-5 flex items-start gap-2.5 rounded-md border border-line bg-panel-2 p-3.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-up" />
              <div className="text-[12.5px]">
                <p className="font-semibold text-ink">
                  Link enviado pra <span className="num">{email}</span>
                </p>
                <p className="mt-1 leading-relaxed text-ink-2">
                  Cheque sua caixa de entrada (e spam). O link expira em 1 hora.
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-ink-3">
          Ao continuar você concorda em receber notificações no WhatsApp.
        </p>
      </div>
    </main>
  );
}
