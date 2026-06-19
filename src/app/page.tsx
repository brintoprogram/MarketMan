import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Coffee, Bell, MessageCircle, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Coffee className="h-5 w-5 text-emerald-600" />
            MarketMan
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/login">
              <Button variant="brand" size="sm">Criar conta</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5" />
          Café arábica, dólar, commodities e mais
        </div>
        <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight text-zinc-900">
          Receba alertas no <span className="text-emerald-600">WhatsApp</span><br />
          quando o mercado se mexer.
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-balance text-lg text-zinc-600">
          Você define o ativo, a variação que importa e os comparativos.
          A gente vigia o mercado 24/7 e te avisa só quando vale a pena olhar.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/login">
            <Button variant="brand" size="lg">Começar grátis</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Bell className="h-5 w-5" />}
            title="Você escolhe o gatilho"
            description="Define a porcentagem de variação que merece um alerta. 1%? 5%? Você decide."
          />
          <FeatureCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Comparativos flexíveis"
            description="Desde a última mensagem, 7 dias, 30 dias ou um período customizado seu."
          />
          <FeatureCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Mensagem limpa"
            description="Sem ruído. Preço atual, variação e contexto, direto no seu WhatsApp."
          />
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500">
        MarketMan · {new Date().getFullYear()}
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        {icon}
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-zinc-600">{description}</p>
    </div>
  );
}
