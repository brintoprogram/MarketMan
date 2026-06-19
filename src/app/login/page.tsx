'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/logo';
import { Zap, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    if (err) setError(err.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-mesh px-6 py-12">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-radial-fade pointer-events-none" />
      <div className="relative w-full max-w-md animate-fade-up">
        <Link href="/" className="mb-8 flex items-center justify-center transition-opacity hover:opacity-80">
          <Logo size="md" />
        </Link>
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>{sent ? 'Verifique seu email' : 'Entrar'}</CardTitle>
            <CardDescription>
              {sent
                ? 'Enviamos um link mágico no seu email. Abre lá pra continuar.'
                : 'Sem senha. Te mandamos um link de acesso direto.'}
            </CardDescription>
          </CardHeader>
          {!sent ? (
            <CardContent>
              <Link href="/api/demo">
                <Button type="button" variant="brand" className="mb-4 w-full" size="lg">
                  <Zap className="h-4 w-4" />
                  Entrar como demo (sem email)
                </Button>
              </Link>
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 font-medium text-zinc-400">ou com email</span>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
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
                {error && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </p>
                )}
                <Button type="submit" variant="default" className="w-full" disabled={loading} size="lg">
                  {loading ? 'Enviando...' : 'Receber link de acesso'}
                </Button>
              </form>
            </CardContent>
          ) : (
            <CardContent>
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/60 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="text-sm">
                  <p className="font-semibold text-emerald-900">Link enviado pra {email}</p>
                  <p className="mt-1 text-emerald-800">Cheque sua caixa de entrada (e spam) e clica no link pra entrar.</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Ao continuar você concorda em receber notificações no WhatsApp.
        </p>
      </div>
    </main>
  );
}
