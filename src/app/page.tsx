import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import {
  Bell, TrendingUp, MessageCircle, Clock, ArrowRight, Repeat, ShieldCheck, Layers
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="sticky top-0 z-40 glass">
        <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-5">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/api/demo">
              <Button variant="brand" size="sm">Modo demo</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        {/* Grid de pontos mascarado — bem sutil */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(24,24,27,0.18) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage:
              'radial-gradient(ellipse 70% 50% at 50% 30%, black 25%, transparent 70%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 50% at 50% 30%, black 25%, transparent 70%)'
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-5 py-24 text-center sm:py-32">
          <div className="num mx-auto mb-7 inline-flex animate-fade-up items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-brand-ink shadow-card">
            <span className="dot-active" />
            Mercado · WhatsApp · 24/7
          </div>

          <h1 className="mx-auto max-w-3xl animate-fade-up-delay-1 text-balance text-[48px] font-bold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[64px]">
            Quando o mercado se mexer,{' '}
            <span className="relative inline-block">
              <span className="relative">você sente.</span>
              <span
                className="absolute bottom-0.5 left-0 right-0 h-[3px] rounded-full bg-brand"
                aria-hidden
              />
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl animate-fade-up-delay-2 text-balance text-[16.5px] leading-relaxed text-ink-2 sm:text-[18px]">
            Acompanha café arábica, dólar, commodities e futuros.
            Você escolhe a variação que importa — a gente avisa no seu WhatsApp, sem fricção.
          </p>

          <div className="mt-9 flex animate-fade-up-delay-3 flex-col items-center justify-center gap-2 sm:flex-row">
            <Link href="/api/demo">
              <Button variant="brand" size="lg" className="group min-w-[200px]">
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
          <p className="num mt-4 animate-fade-up-delay-3 text-[11px] text-ink-3">
            Modo demo: dashboard pronto com dados de exemplo · sem cadastro
          </p>

          {/* Stats com hairline vertical */}
          <div className="mx-auto mt-14 grid max-w-3xl animate-fade-up-delay-3 grid-cols-3 divide-x divide-line border-y border-line py-5">
            <Stat number="7+" label="Ativos monitorados" />
            <Stat number="15min" label="Frequência" />
            <Stat number="∞" label="Alertas por usuário" />
          </div>
        </div>
      </section>

      {/* Bento */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-10 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
            Como funciona
          </div>
          <h2 className="mt-1.5 text-[28px] font-bold tracking-[-0.025em] text-ink sm:text-[32px]">
            Configura uma vez. <span className="text-ink-3">Esquece pra sempre.</span>
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-6">
          <FeatureCard
            className="md:col-span-4 md:row-span-2"
            icon={<Bell className="h-4 w-4" />}
            title="Você escolhe o gatilho"
            description="Define a porcentagem de variação que merece um aviso. 1%? 5%? Você decide. A gente respeita."
            big
          >
            <div className="mt-5 rounded-md border border-line bg-panel-2 p-3.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Exemplo</span>
                <span className="num inline-flex items-center gap-1 rounded-sm bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink">
                  <span className="dot-active" />Ativo
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="num text-[10.5px] font-medium uppercase tracking-wider text-ink-3">ICF</div>
                  <div className="text-[13px] font-semibold text-ink">Café arábica</div>
                  <div className="num mt-0.5 text-[15.5px] font-semibold text-ink">≥ 1,5%</div>
                </div>
                <div className="text-right">
                  <div className="text-[10.5px] text-ink-3">desde a última msg</div>
                  <div className="num mt-0.5 text-[12.5px] font-medium text-up">+2,34%</div>
                </div>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            className="md:col-span-2"
            icon={<Clock className="h-4 w-4" />}
            title="Coleta a cada 15min"
            description="24/7, inclusive fins de semana pra moedas e cripto."
          />
          <FeatureCard
            className="md:col-span-2"
            icon={<Repeat className="h-4 w-4" />}
            title="Comparativos flexíveis"
            description="Desde a última msg, 7 dias, 30 dias ou um período seu."
          />
          <FeatureCard
            className="md:col-span-3"
            icon={<MessageCircle className="h-4 w-4" />}
            title="Mensagem limpa, no ponto"
            description="Sem ruído. Preço atual, variação e referência — direto no WhatsApp."
          />
          <FeatureCard
            className="md:col-span-3"
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Inbox respeitado"
            description="Se você responder o aviso, a gente ignora. Você não é um ticket, é um humano."
          />
        </div>
      </section>

      {/* CTA final — cuidadoso, sem gradiente forte */}
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <div className="rounded-xl border border-line bg-panel p-8 text-center shadow-card">
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="text-[22px] font-bold tracking-[-0.025em] text-ink sm:text-[26px]">
            Comece em 5 segundos
          </h3>
          <p className="mx-auto mt-2 max-w-md text-balance text-[13.5px] leading-relaxed text-ink-2">
            Sem cadastro, sem email. Entra no modo demo e já vê o dashboard com dados de exemplo.
          </p>
          <div className="mt-5">
            <Link href="/api/demo">
              <Button variant="brand" size="lg">
                Entrar como demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 sm:flex-row">
          <Logo size="sm" />
          <div className="num text-[11px] text-ink-3">© {new Date().getFullYear()} MarketMan</div>
        </div>
      </footer>
    </main>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="px-3">
      <div className="num text-[28px] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">{number}</div>
      <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon, title, description, className, big, children
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  big?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`card-hover relative overflow-hidden rounded-xl border border-line bg-panel p-5 shadow-card ${className ?? ''}`}
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
        {icon}
      </div>
      <h3 className={`mb-1 font-semibold tracking-tight text-ink ${big ? 'text-[17px]' : 'text-[14px]'}`}>{title}</h3>
      <p className="text-[12.5px] leading-relaxed text-ink-2">{description}</p>
      {children}
    </div>
  );
}
