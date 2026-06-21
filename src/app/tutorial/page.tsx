import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { TutorialTOC } from '@/components/tutorial-toc';
import {
  ArrowRight, Bell, CalendarClock, MessageCircle, Users, Sliders, Settings,
  Database, Cpu, HardDrive, Send, Wand2, Layers, AlertCircle, Check, X, Clock,
  ChevronRight
} from 'lucide-react';

export const dynamic = 'force-static';

const SECTIONS = [
  { id: 'visao-geral',      label: 'Visão geral' },
  { id: 'cotacoes',         label: 'Acompanhar cotações' },
  { id: 'alertas',          label: 'Criar alertas' },
  { id: 'relatorios',       label: 'Relatórios agendados' },
  { id: 'destinatarios',    label: 'Múltiplos destinatários' },
  { id: 'comandos',         label: 'Comandos no WhatsApp' },
  { id: 'templates',        label: 'Templates prontos' },
  { id: 'personalizacao',   label: 'Personalizar dashboard' },
  { id: 'configuracoes',    label: 'Configurações importantes' },
  { id: 'faq',              label: 'Perguntas frequentes' }
];

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      {/* Header */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <div className="animate-fade-up">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
              Guia
            </div>
            <h1 className="text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[40px]">
              Como funciona o MarketMan
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2">
              Tudo que dá pra fazer aqui — coletar cotações, criar alertas, agendar relatórios,
              responder no WhatsApp, distribuir pra equipe. Leitura ~6 minutos.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/templates">
                <Button variant="brand" size="sm">
                  <Wand2 className="h-3.5 w-3.5" />
                  Começar com um template
                </Button>
              </Link>
              <Link href="/alerts/new">
                <Button variant="outline" size="sm">Criar alerta do zero</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <TutorialTOC sections={SECTIONS} />

        <article className="min-w-0 space-y-14">
          {/* ============ VISÃO GERAL ============ */}
          <Section id="visao-geral" eyebrow="01" title="Visão geral">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              MarketMan vigia o mercado pra você. O sistema faz <strong className="text-ink">3 coisas em loop</strong>:
              coleta preço, avalia seus gatilhos, e te avisa no WhatsApp quando vale a pena olhar.
              Você nunca precisa abrir o site se não quiser — a mensagem chega no chat.
            </p>

            {/* Pipeline */}
            <div className="mt-5 rounded-xl border border-line bg-panel p-5 shadow-card">
              <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                Pipeline de coleta
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <PipeNode icon={<Database className="h-3.5 w-3.5" />} title="brapi.dev" sub="provedor da B3" />
                <PipeArrow />
                <PipeNode icon={<Cpu className="h-3.5 w-3.5" />} title="Edge Function" sub="fetch-quotes a cada 15min" />
                <PipeArrow />
                <PipeNode icon={<HardDrive className="h-3.5 w-3.5" />} title="Postgres" sub="série histórica" />
                <PipeArrow />
                <PipeNode icon={<Send className="h-3.5 w-3.5" />} title="WhatsApp" sub="via Z-API" accent />
              </div>
              <p className="mt-4 text-[12px] text-ink-3">
                A cada execução, o sistema busca o preço atual, salva no banco e avalia
                <strong className="text-ink-2"> seus alertas</strong>. Se algum bate o gatilho, vira mensagem.
                Os <strong className="text-ink-2">relatórios agendados</strong> seguem o cron que você definiu.
              </p>
            </div>

            {/* Cards de features */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <FeatureBlock
                icon={<Bell className="h-4 w-4" />}
                title="Alertas inteligentes"
                description="Variação % ou preço-alvo. Define a régua uma vez e esquece."
                href="#alertas"
              />
              <FeatureBlock
                icon={<CalendarClock className="h-4 w-4" />}
                title="Relatórios agendados"
                description="Tabela personalizada chega no horário que você definir."
                href="#relatorios"
              />
              <FeatureBlock
                icon={<Users className="h-4 w-4" />}
                title="Múltiplos destinatários"
                description="Um alerta, vários números. Cooperativa, equipe, corretor."
                href="#destinatarios"
              />
              <FeatureBlock
                icon={<MessageCircle className="h-4 w-4" />}
                title="Comandos no WhatsApp"
                description="Manda PREÇO ICF e recebe a cotação. Sem abrir o app."
                href="#comandos"
              />
            </div>
          </Section>

          {/* ============ COTAÇÕES ============ */}
          <Section id="cotacoes" eyebrow="02" title="Acompanhar cotações">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              O <Anchor href="/dashboard">dashboard</Anchor> mostra todos os ativos monitorados. Cada card tem
              o preço atual em mono tabular, variação 7d, sparkline colorido pela direção (verde se +, vermelho se −)
              e a unidade do ativo. Clique pra ver o detalhamento completo.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Bullet icon={<HighlightOk />}>
                <strong className="text-ink">Verde = alta</strong> · <strong className="text-ink">Vermelho = baixa</strong>.
                A cor segue a direção real — não é decoração.
              </Bullet>
              <Bullet icon={<HighlightOk />}>
                <strong className="text-ink">Mono tabular</strong> em toda cifra. Números alinhados, fáceis de comparar
                visualmente entre cards.
              </Bullet>
              <Bullet icon={<HighlightOk />}>
                <strong className="text-ink">Filtros</strong> de categoria (commodity / moeda / índice) no topo
                dos cards pra focar no que importa agora.
              </Bullet>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
              Na <strong className="text-ink">página de detalhe</strong> de cada ativo você vê o gráfico com
              timeframes (1D / 1W / 1M / 3M / 6M / 1Y), overlay com outro ativo pra comparar
              (ex: café × dólar), médias móveis, RSI, Bollinger, conversões automáticas em outras unidades
              e a <strong className="text-ink">timeline de origem do dado</strong> — você sabe exatamente
              de onde veio cada número.
            </p>
          </Section>

          {/* ============ ALERTAS ============ */}
          <Section id="alertas" eyebrow="03" title="Criar alertas">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              Alertas são o coração do MarketMan. Tem <strong className="text-ink">2 tipos</strong>:
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TypeCard
                title="Variação %"
                tagline="Avisa a cada X% de variação"
                example="Café arábica oscilou ≥ 1,5% desde a última mensagem"
                bullets={[
                  'Compara desde a última msg, 7d, 30d ou período customizado',
                  'Bom pra acompanhar movimentos relevantes sem ser bombardeado',
                  'O ponto de referência reseta a cada disparo (modo "última msg")'
                ]}
              />
              <TypeCard
                title="Preço-alvo absoluto"
                tagline="Avisa quando o preço passar de um valor"
                example="Dólar subir acima de R$ 5,30 ou cair abaixo de R$ 4,90"
                bullets={[
                  '3 direções: subir acima, cair abaixo, cruzar (ambas)',
                  'Só dispara uma vez por nível (até o usuário resetar)',
                  'Perfeito pra planejar venda/compra em níveis técnicos'
                ]}
              />
            </div>

            <div className="mt-5 rounded-md border border-line bg-panel-2 p-4">
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
                Como criar
              </div>
              <ol className="space-y-1.5 text-[13px] text-ink-2">
                <Step n={1}>Em <Anchor href="/alerts/new">/alerts/new</Anchor>, escolha o tipo (variação % ou preço-alvo).</Step>
                <Step n={2}>Selecione o ativo na lista.</Step>
                <Step n={3}>Defina o valor com slider ou input numérico (a prévia da mensagem atualiza ao vivo à direita).</Step>
                <Step n={4}>Personalize o template com variáveis clicáveis (<code className="num rounded bg-panel px-1 text-[10.5px]">{'{price}'}</code>, <code className="num rounded bg-panel px-1 text-[10.5px]">{'{pct}'}</code>, etc).</Step>
                <Step n={5}>Escolha quem recebe (você por padrão) e qual o limite diário de envios.</Step>
                <Step n={6}>Salva. Pronto, o cron faz o resto.</Step>
              </ol>
            </div>
          </Section>

          {/* ============ RELATÓRIOS ============ */}
          <Section id="relatorios" eyebrow="04" title="Relatórios agendados">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              Tabelas personalizadas enviadas no horário que você definir. Bom pra começar o dia com
              o panorama do mercado, ou ter um fechamento toda sexta.
            </p>

            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
              Em <Anchor href="/reports/new">/reports/new</Anchor> você escolhe quando enviar (presets:
              diário às 8h, fechamento 18h, sextas, ou cron custom), <strong className="text-ink">quais ativos</strong> incluir
              e o que mostrar (variações 24h/7d/30d, volume, calendar spread).
            </p>

            <div className="mt-5 rounded-md border border-line bg-panel-2 p-4">
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
                Exemplo de mensagem
              </div>
              <pre className="num overflow-x-auto whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-ink-2">
{`📊 *Fechamento da semana*
_sex, 21/06/2026, 18:00 BRT_

*ICF* · Café Arábica (B3)
  US$ 330,95  USD/saca 60kg
  🟢 1d: +1,23%
  🟢 7d: +3,12%
  Spread ICFN26↔ICFU26: -3,91% (backwardation)

*USDBRL* · Dólar Americano
  R$ 5,14
  🔴 1d: -0,32%
  🟢 7d: +0,84%

— MarketMan`}
              </pre>
            </div>

            <Note>
              Relatórios <strong className="text-ink">respeitam quiet hours</strong>. Se cair dentro do
              seu intervalo de silêncio, vira skip silencioso (não atrasa).
            </Note>
          </Section>

          {/* ============ DESTINATÁRIOS ============ */}
          <Section id="destinatarios" eyebrow="05" title="Múltiplos destinatários">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              Um alerta pode disparar pra vários números. Útil pra <strong className="text-ink">cooperativa</strong>,
              <strong className="text-ink"> equipe de mesa</strong>, ou produtor + corretor.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Bullet icon={<HighlightOk />}>
                Em <Anchor href="/recipients">/recipients</Anchor> cadastra cada destinatário com nome e
                número de WhatsApp.
              </Bullet>
              <Bullet icon={<HighlightOk />}>
                Cada novo número recebe um <strong className="text-ink">código OTP</strong> pra confirmar
                (evita spam pro número errado).
              </Bullet>
              <Bullet icon={<HighlightOk />}>
                Ao criar alerta ou relatório, escolhe quem recebe. Vazio = vai só pro seu número.
              </Bullet>
            </div>
          </Section>

          {/* ============ COMANDOS ============ */}
          <Section id="comandos" eyebrow="06" title="Comandos no WhatsApp">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              Responda no WhatsApp pra consultar/controlar o sistema sem abrir o app. Reconhecido só
              do seu número verificado.
            </p>

            <div className="mt-4 overflow-hidden rounded-md border border-line">
              <table className="w-full">
                <thead className="border-b border-line bg-panel-2/50 text-left">
                  <tr>
                    <th className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3">Comando</th>
                    <th className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3">O que faz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <CmdRow cmd="PREÇO ICF" desc="cotação atual + variações 1d/7d desse ativo" />
                  <CmdRow cmd="PREÇOS" desc="tabela com todos os ativos ativos" />
                  <CmdRow cmd="STATUS" desc="quantos alertas, último ping, se está pausado" />
                  <CmdRow cmd="PAUSAR" desc="snooze de 24h em todos os alertas" />
                  <CmdRow cmd="PAUSAR 48" desc="snooze de N horas (1 a 720)" />
                  <CmdRow cmd="ATIVAR" desc="retoma alertas depois da pausa" />
                  <CmdRow cmd="PARAR" desc="desativa todos os alertas (pode reativar depois)" />
                  <CmdRow cmd="AJUDA" desc="menu de comandos disponíveis" />
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[12px] text-ink-3">
              Case-insensitive. Aceita acentuação (<span className="num">PREÇO</span> ou <span className="num">PRECO</span>).
              Mensagens que não casam com nenhum comando são <strong>ignoradas em silêncio</strong> — não polui chat.
            </p>
          </Section>

          {/* ============ TEMPLATES ============ */}
          <Section id="templates" eyebrow="07" title="Templates prontos">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              Em <Anchor href="/templates">/templates</Anchor> você escolhe um perfil
              (trader de café, produtor de grãos, pecuarista, indústria, trader macro…) e o sistema
              cria N alertas + 1 relatório agendado <strong className="text-ink">em 1 clique</strong>.
            </p>
            <p className="mt-3 text-[13px] text-ink-2">
              Ótimo pra começar: você fica com algo útil rodando em segundos, e ajusta os parâmetros
              depois conforme aprende o que importa pra você.
            </p>
          </Section>

          {/* ============ PERSONALIZAÇÃO ============ */}
          <Section id="personalizacao" eyebrow="08" title="Personalizar dashboard">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              Não quer ver os 13 ativos? Use o botão <strong className="text-ink inline-flex items-center gap-1"><Sliders className="h-3 w-3" />Personalizar</strong> no canto do dashboard.
              Aparece um painel à direita onde você:
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-ink-2">
              <Bullet icon={<HighlightOk />}>Escolhe quais ativos aparecem nos cards.</Bullet>
              <Bullet icon={<HighlightOk />}>Reordena com setinhas ↑↓ (o que vem em cima fica em cima).</Bullet>
              <Bullet icon={<HighlightOk />}>Restaura o padrão a qualquer momento (mostra todos na ordem do banco).</Bullet>
            </ul>
            <Note>
              Isso só altera o <strong className="text-ink">visual</strong> do dashboard.
              Os ativos não escolhidos continuam sendo coletados normalmente — você só não vê os cards.
            </Note>
          </Section>

          {/* ============ CONFIGURAÇÕES ============ */}
          <Section id="configuracoes" eyebrow="09" title="Configurações importantes">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              Em <Anchor href="/settings">/settings</Anchor> você controla a infraestrutura.
            </p>

            <div className="mt-4 space-y-3">
              <ConfigRow
                icon={<Clock className="h-3.5 w-3.5" />}
                title="Frequência de coleta"
                body="De quanto em quanto tempo o cron busca novos preços. Padrão: 15min. Mais frequente = alertas mais rápidos, mais consumo da brapi."
              />
              <ConfigRow
                icon={<AlertCircle className="h-3.5 w-3.5" />}
                title="Rate limit da brapi"
                body="Limite diário de chamadas à brapi. Bate o teto = chamadas extras são bloqueadas e logadas. Sugestão: 1.000/dia."
              />
              <ConfigRow
                icon={<HardDrive className="h-3.5 w-3.5" />}
                title="Quiet hours"
                body="Janela em que MarketMan não envia nada (alertas nem relatórios). Ex: 22h às 7h da manhã."
              />
              <ConfigRow
                icon={<MessageCircle className="h-3.5 w-3.5" />}
                title="Limite diário de mensagens"
                body="Máximo de mensagens (alertas + relatórios) por 24h pro seu número. Anti-bombardeio em dia volátil."
              />
            </div>
          </Section>

          {/* ============ FAQ ============ */}
          <Section id="faq" eyebrow="10" title="Perguntas frequentes">
            <div className="space-y-2">
              <Faq q="Recebo alerta repetido se o mercado fica oscilando ao redor do meu threshold?">
                Não. No modo <em>desde a última mensagem</em>, o ponto de referência reseta a cada
                disparo. Pra disparar de novo, o preço precisa variar mais um threshold completo
                a partir do novo ponto.
              </Faq>
              <Faq q="O que acontece se a Z-API cair quando um alerta dispara?">
                A mensagem entra numa fila de retry com backoff exponencial:
                1m → 5m → 30m → 2h → 6h. Depois de 5 tentativas marca como falha definitiva.
                Você vê o status em <Anchor href="/messages">/messages</Anchor>.
              </Faq>
              <Faq q="Posso desligar todos os alertas temporariamente?">
                Sim. Manda <strong className="num text-ink">PAUSAR</strong> no WhatsApp (24h) ou
                <strong className="num text-ink"> PAUSAR 48</strong> (N horas). Ou configura
                <strong className="text-ink"> quiet hours</strong> pra silenciar em horários fixos.
              </Faq>
              <Faq q="Como sei se a mensagem foi entregue/lida no WhatsApp?">
                Configure o webhook on-status da Z-API apontando pra
                <code className="num rounded bg-panel-2 px-1.5 py-0.5 text-[10.5px] text-ink-2"> /api/whatsapp-status</code>.
                Aí em <Anchor href="/messages">/messages</Anchor> você vê ✓ enviada → ✓✓ entregue (verde) → ✓✓ lida (azul).
              </Faq>
              <Faq q="Posso ter destinatário diferente por alerta?">
                Pode. Em cada alerta ou relatório você escolhe pra quem vai. Pode ter um
                alerta pra você, outro pra equipe inteira, outro só pro corretor.
              </Faq>
              <Faq q="O que é calendar spread?">
                A diferença de preço entre o vencimento vigente (M0) e o próximo (M+1).
                Spread positivo = <strong className="text-ink">contango</strong> (mercado abastecido,
                custo de carregamento). Negativo = <strong className="text-ink">backwardation</strong>
                (escassez no curto prazo, demanda física forte). É um sinal poderoso pra commodities.
              </Faq>
            </div>
          </Section>

          {/* CTA */}
          <div className="rounded-xl border border-line bg-panel p-8 text-center shadow-card">
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
              <Wand2 className="h-5 w-5" />
            </div>
            <h3 className="text-[20px] font-bold tracking-[-0.025em] text-ink">
              Bora começar?
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-2">
              Use um template pronto se quer ir direto ao ponto, ou crie do zero pra desenhar
              do seu jeito.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href="/templates">
                <Button variant="brand" size="sm">
                  <Wand2 className="h-3.5 w-3.5" />
                  Ver templates
                </Button>
              </Link>
              <Link href="/alerts/new">
                <Button variant="outline" size="sm">Criar alerta do zero</Button>
              </Link>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

/* ============================ helpers de layout ============================ */

function Section({ id, eyebrow, title, children }: {
  id: string; eyebrow: string; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[80px]">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="num text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
          {eyebrow}
        </span>
        <h2 className="text-[24px] font-bold tracking-[-0.025em] text-ink sm:text-[28px]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function PipeNode({ icon, title, sub, accent }: {
  icon: React.ReactNode; title: string; sub: string; accent?: boolean;
}) {
  return (
    <div className={`flex items-start gap-2 rounded-md border ${accent ? 'border-brand bg-brand-soft' : 'border-line bg-panel-2/40'} px-2.5 py-2`}>
      <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${accent ? 'bg-brand text-white' : 'bg-panel text-ink-2'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="num text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{title}</div>
        <div className="text-[11.5px] font-medium text-ink">{sub}</div>
      </div>
    </div>
  );
}

function PipeArrow() {
  return (
    <div className="flex items-center justify-center text-ink-3">
      <ChevronRight className="h-4 w-4" />
    </div>
  );
}

function FeatureBlock({ icon, title, description, href }: {
  icon: React.ReactNode; title: string; description: string; href: string;
}) {
  return (
    <a href={href} className="card-hover rounded-md border border-line bg-panel p-4 shadow-card">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
        {icon}
      </div>
      <h4 className="text-[13.5px] font-semibold text-ink">{title}</h4>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{description}</p>
      <div className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-ink">
        Ler <ArrowRight className="h-3 w-3" />
      </div>
    </a>
  );
}

function TypeCard({ title, tagline, example, bullets }: {
  title: string; tagline: string; example: string; bullets: string[];
}) {
  return (
    <div className="rounded-md border border-line bg-panel p-4 shadow-card">
      <h4 className="text-[14px] font-semibold text-ink">{title}</h4>
      <p className="mt-0.5 text-[11.5px] font-medium text-brand-ink">{tagline}</p>
      <div className="mt-3 rounded border border-line bg-panel-2 p-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Ex.</div>
        <p className="num mt-0.5 text-[12px] text-ink">{example}</p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-1.5 text-[12px] text-ink-2">
            <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-up" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="num mt-0.5 inline-flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full border border-line bg-panel text-[10px] font-semibold text-ink-2" style={{ height: 18, width: 18 }}>
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith('http');
  if (isExternal) {
    return <a href={href} className="num text-brand-ink hover:underline" target="_blank" rel="noreferrer">{children}</a>;
  }
  if (href.startsWith('#')) {
    return <a href={href} className="num text-brand-ink hover:underline">{children}</a>;
  }
  return <Link href={href} className="num text-brand-ink hover:underline">{children}</Link>;
}

function Bullet({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[12.5px] text-ink-2">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function HighlightOk() { return <Check className="h-3 w-3 text-up" />; }

function CmdRow({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <tr className="hover:bg-brand-soft/40">
      <td className="px-3 py-2 align-top">
        <code className="num rounded bg-panel-2 px-1.5 py-0.5 text-[11px] font-semibold text-brand-ink">{cmd}</code>
      </td>
      <td className="px-3 py-2 text-[12px] text-ink-2">{desc}</td>
    </tr>
  );
}

function ConfigRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-line bg-panel p-3">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
        {icon}
      </span>
      <div>
        <h4 className="text-[13px] font-semibold text-ink">{title}</h4>
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{body}</p>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-md border border-line bg-panel-2/40 px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
      {children}
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="card-hover rounded-md border border-line bg-panel px-4 py-3">
      <summary className="cursor-pointer select-none text-[13px] font-semibold text-ink">
        {q}
      </summary>
      <div className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{children}</div>
    </details>
  );
}
