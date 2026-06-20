'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, RefreshCw, CheckCircle2, Clock, User, Users, MessageCircle } from 'lucide-react';

interface Recipient {
  id: string;
  name: string;
  phone: string;
  verified: boolean;
  is_self: boolean;
  created_at: string;
}

interface Props { initial: Recipient[]; }

export function RecipientsManager({ initial }: Props) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch('/api/recipients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_otp', name, phone })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Falha'); return; }
    setPendingId(data.id);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingId) return;
    setLoading(true); setError(null);
    const res = await fetch('/api/recipients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_otp', id: pendingId, otp })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Falha'); return; }
    // sucesso: reseta form e atualiza
    setName(''); setPhone(''); setOtp(''); setPendingId(null); setAdding(false);
    router.refresh();
  }

  async function resendOtp(id: string) {
    setLoading(true); setError(null);
    const res = await fetch('/api/recipients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend_otp', id })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Falha'); return; }
    setPendingId(id);
  }

  async function remove(id: string) {
    if (!confirm('Remover esse destinatário? Alertas e relatórios que dependiam dele param de mandar pra ele.')) return;
    const res = await fetch(`/api/recipients?id=${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? 'Falha'); return; }
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    router.refresh();
  }

  const verifiedCount = recipients.filter((r) => r.verified).length;

  return (
    <div className="space-y-6">
      {/* Lista */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-brand-600" />Sua lista</CardTitle>
              <CardDescription>{verifiedCount} destinatário{verifiedCount === 1 ? '' : 's'} verificado{verifiedCount === 1 ? '' : 's'} · {recipients.length} no total</CardDescription>
            </div>
            {!adding && (
              <Button variant="brand" onClick={() => { setAdding(true); setError(null); }}>
                <Plus className="h-4 w-4" />Adicionar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Nenhum destinatário ainda.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recipients.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ${
                      r.verified
                        ? r.is_self ? 'bg-brand-50 text-brand-700 ring-brand-200/60' : 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
                        : 'bg-amber-50 text-amber-700 ring-amber-200/60'
                    }`}>
                      {r.is_self ? <User className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900">{r.name}</span>
                        {r.is_self && <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">você</span>}
                        {r.verified
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="h-2.5 w-2.5" />verificado</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700"><Clock className="h-2.5 w-2.5" />pendente</span>}
                      </div>
                      <div className="font-mono text-xs text-zinc-500">+{r.phone}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!r.verified && (
                      <Button variant="ghost" size="sm" onClick={() => resendOtp(r.id)} disabled={loading}>
                        <RefreshCw className="h-3.5 w-3.5" />Reenviar
                      </Button>
                    )}
                    {!r.is_self && (
                      <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Formulário de adicionar */}
      {adding && (
        <Card className="shadow-lifted animate-fade-up">
          <CardHeader>
            <CardTitle>{pendingId ? 'Confirme o código' : 'Novo destinatário'}</CardTitle>
            <CardDescription>
              {pendingId
                ? `Enviamos um código de 6 dígitos pra ${phone}. Peça pra essa pessoa abrir o WhatsApp e te passar.`
                : 'Vamos enviar um código de verificação no WhatsApp dessa pessoa antes de cadastrar.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingId ? (
              <form onSubmit={sendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rname">Nome do destinatário</Label>
                  <Input id="rname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pedro · Equipe café · Marcos (corretor)" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rphone">WhatsApp</Label>
                  <Input id="rphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" required />
                </div>
                {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                <div className="flex gap-3">
                  <Button type="submit" variant="brand" disabled={loading}>{loading ? 'Enviando...' : 'Enviar código'}</Button>
                  <Button type="button" variant="outline" onClick={() => { setAdding(false); setError(null); }}>Cancelar</Button>
                </div>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rotp">Código (6 dígitos)</Label>
                  <Input id="rotp" type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required placeholder="••••••" className="text-center text-2xl tracking-[0.6em] font-mono" />
                </div>
                {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                <div className="flex gap-3">
                  <Button type="submit" variant="brand" disabled={loading || otp.length !== 6}>{loading ? 'Verificando...' : 'Confirmar'}</Button>
                  <Button type="button" variant="outline" onClick={() => { setPendingId(null); setOtp(''); setError(null); }}>Mudar número</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
