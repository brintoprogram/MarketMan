'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Coffee } from 'lucide-react';

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
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold">
          <Coffee className="h-5 w-5 text-emerald-600" />
          MarketMan
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              {sent
                ? 'Enviamos um link mágico no seu email. Abre lá pra continuar.'
                : 'Te mandamos um link de acesso no email. Sem senha.'}
            </CardDescription>
          </CardHeader>
          {!sent && (
            <CardContent>
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
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <Button type="submit" variant="brand" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Receber link de acesso'}
                </Button>
              </form>
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
