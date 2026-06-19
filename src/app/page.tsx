import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Bell, TrendingUp, MessageCircle, Zap, Sparkles, ArrowRight, BarChart3, Clock, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-mesh">
      {/* Nav */}
      <nav className="sticky top-0 z-40 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/api/demo">
              <Button variant="ghost" size="sm">Modo demo</Button>
            </Link>
            <Link href="/login">
              <Button variant="brand" size="sm">Entrar</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="absolute inset-0 bg-radial-fade pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <div className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand-200/60 bg-white/80 px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Tempo real · WhatsApp · 24/7
          </div>
          <h1 className="mb-6 animate-fade-up-delay-1 text-balance text-5xl font-bold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl">
            Quando o mercado<br />
            se mexer,{' '}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-brand bg-clip-text text-transparent">você sente.</span>
              <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-md bg-brand-200/50" />
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl animate-fade-up-delay-2 text-balance text-lg leading-relaxed text-zinc-600 sm:text-xl">
            Acompanha café arábica, dólar, commodities e futuros.
            Você escolhe a variação que importa — a gente avisa no seu WhatsApp, sem fricção.
          </p>
          <div className="flex animate-fade-up-delay-3 flex-col justify-center gap-3 sm:flex-row">
            <Link href="/api/demo">
              <Button variant="brand" size="lg" className="group min-w-[200px]">
                <Zap className="h-4 w-4" />
                Entrar como demo
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                Entrar com email
              </Button>
            </Link>
          </div>
          <p className="mt-5 animate-fade-up-delay-3 text-xs text-zinc-500">
            Modo demo: dashboard pronto com dados de exemplo · sem cadastro
          </p>

          {/* Stats row */}
          <div className="mx-auto mt-16 grid max-w-3xl animate-fade-up-delay-3 grid-cols-3 gap-4 sm:gap-8">
            <Stat number="7+" label="Ativos monitorados" />
            <Stat number="15min" label="Frequência de coleta" />
            <Stat number="∞" label="Alertas por usuário" />
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-10 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Como funciona</div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Configura uma vez. <span className="text-zinc-400">Esquece pra sempre.</span>
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          {/* Big card */}
          <FeatureCard
            className="md:col-span-4 md:row-span-2"
            icon={<Bell className="h-5 w-5" />}
            title="Você escolhe o gatilho"
            description="Define a porcentagem de variação que merece um aviso. 1%? 5%? Você decide. A gente respeita."
            big
          >
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-500">Exemplo</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">ATIVO</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-zinc-500">Café arábica (ICF)</div>
                  <div className="text-lg font-semibold text-zinc-900">≥ 1,5%</div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-zinc-500">desde a última msg</div>
                  <div className="font-medium text-emerald-600">+2,34%</div>
                </div>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            className="md:col-span-2"
            icon={<Clock className="h-5 w-5" />}
            title="Coleta a cada 15min"
            description="24/7, inclusive em finais de semana pra moedas e cripto."
          />
          <FeatureCard
            className="md:col-span-2"
            icon={<TrendingUp className="h-5 w-5" />}
            title="Comparativos flexíveis"
            description="Desde a última mensagem, 7 dias, 30 dias ou um período seu."
          />
          <FeatureCard
            className="md:col-span-3"
            icon={<MessageCircle className="h-5 w-5" />}
            title="Mensagem limpa, no ponto"
            description="Sem ruído. Preço atual, variação e referência — direto no WhatsApp."
          />
          <FeatureCard
            className="md:col-span-3"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Sem inbox poluído"
            description="Se você responder o aviso, a gente ignora. Você não é um ticket, é um humano."
          />
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 text-center shadow-elevated">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative">
            <BarChart3 className="mx-auto mb-4 h-10 w-10 text-white/90" />
            <h3 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
              Comece em 5 segundos
            </h3>
            <p className="mx-auto mb-6 max-w-md text-balance text-white/85">
              Sem cadastro, sem email. Entra no modo demo e já vê o dashboard com dados de exemplo.
            </p>
            <Link href="/api/demo">
              <Button size="lg" className="bg-white text-brand-700 shadow-elevated hover:bg-zinc-50 hover:text-brand-800">
                Entrar como demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200/80 bg-white/50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <Logo size="sm" />
          <div className="text-sm text-zinc-500">© {new Date().getFullYear()} MarketMan</div>
        </div>
      </footer>
    </main>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{number}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500 sm:text-sm">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon, title, description, className, big, children
}: {
  icon: React.ReactNode; title: string; description: string;
  className?: string; big?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className={`group card-hover relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft hover:shadow-lifted ${className ?? ''}`}>
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/60 transition group-hover:scale-105 group-hover:bg-brand-100">
        {icon}
      </div>
      <h3 className={`mb-1.5 font-semibold tracking-tight text-zinc-900 ${big ? 'text-xl' : 'text-base'}`}>{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-600">{description}</p>
      {children}
    </div>
  );
}
