// Timeline vertical "De onde vem esse dado".
// Substitui o dump técnico antigo (URL/raw JSON/cards de status) por uma
// linha do tempo limpa com nós: brapi.dev → fetch-quotes → Postgres → seu alerta.

import { ExternalLink, Database, Cpu, HardDrive, Bell, BellOff } from 'lucide-react';
import { relativeTime } from '@/lib/format';

interface Props {
  provider: 'brapi.dev' | 'cepea' | string;
  endpointUrl: string;
  brapiKind: string;
  brapiSymbol: string;
  actualSymbol?: string | null;        // contrato resolvido (ex: ICFN26)
  lastFetchAt?: string | null;
  lastFetchDuration?: number | null;
  lastFetchOk: boolean;
  lastFetchError?: string | null;
  insertedAt?: string | null;          // quando o quote mais recente foi gravado
  insertedPrice?: number | null;
  userAlertCount: number;
  lastNotifiedAt?: string | null;
}

export function DataSourceTimeline(props: Props) {
  const {
    provider, endpointUrl, brapiKind, brapiSymbol, actualSymbol,
    lastFetchAt, lastFetchDuration, lastFetchOk, lastFetchError,
    insertedAt, insertedPrice, userAlertCount, lastNotifiedAt
  } = props;

  return (
    <div className="relative">
      {/* Linha vertical de fundo */}
      <div className="absolute bottom-3 left-[15px] top-3 w-px bg-line" aria-hidden />

      <ol className="space-y-5">
        <Node
          icon={<Database className="h-3 w-3" />}
          title={`Provedor · ${provider}`}
          meta={
            <a
              href={endpointUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate font-mono text-[11px] text-ink-3 hover:text-brand-ink"
            >
              <span className="truncate">{endpointUrl}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          }
          chip={brapiKind}
          accent="ink"
        >
          <p className="text-[12px] text-ink-2">
            Símbolo na fonte: <span className="num font-medium text-ink">{brapiSymbol}</span>
            {actualSymbol && actualSymbol !== brapiSymbol && (
              <>
                {' '}→ resolvido pra <span className="num font-medium text-ink">{actualSymbol}</span>
              </>
            )}
          </p>
        </Node>

        <Node
          icon={<Cpu className="h-3 w-3" />}
          title="Edge Function · fetch-quotes"
          meta={
            lastFetchAt ? (
              <span className="num text-[11px] text-ink-3">
                {relativeTime(lastFetchAt)}
                {lastFetchDuration != null && ` · ${lastFetchDuration}ms`}
              </span>
            ) : (
              <span className="text-[11px] text-ink-3">sem execução registrada</span>
            )
          }
          accent={lastFetchOk ? 'up' : 'down'}
        >
          {lastFetchOk ? (
            <p className="text-[12px] text-ink-2">
              Coleta bem-sucedida. O endpoint respondeu e o preço foi extraído sem erro.
            </p>
          ) : (
            <p className="text-[12px] text-down">
              {lastFetchError ?? 'Última coleta falhou.'}
            </p>
          )}
        </Node>

        <Node
          icon={<HardDrive className="h-3 w-3" />}
          title="Postgres · quotes"
          meta={
            insertedAt ? (
              <span className="num text-[11px] text-ink-3">{relativeTime(insertedAt)}</span>
            ) : (
              <span className="text-[11px] text-ink-3">sem cotação ainda</span>
            )
          }
          accent="ink"
        >
          {insertedPrice != null ? (
            <p className="text-[12px] text-ink-2">
              Última inserção: <span className="num font-medium text-ink">{insertedPrice.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</span>{' '}
              gravada na tabela <code className="rounded bg-panel-2 px-1 py-0.5 font-mono text-[10px] text-ink-2">public.quotes</code>.
            </p>
          ) : (
            <p className="text-[12px] text-ink-3">Aguardando primeira coleta pra popular a série histórica.</p>
          )}
        </Node>

        <Node
          icon={userAlertCount > 0 ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
          title={userAlertCount > 0 ? 'Seus alertas' : 'Sem alerta neste ativo'}
          meta={
            lastNotifiedAt ? (
              <span className="num text-[11px] text-ink-3">último ping {relativeTime(lastNotifiedAt)}</span>
            ) : (
              <span className="text-[11px] text-ink-3">{userAlertCount > 0 ? 'nunca disparou' : '—'}</span>
            )
          }
          accent={userAlertCount > 0 ? 'brand' : 'muted'}
        >
          <p className="text-[12px] text-ink-2">
            {userAlertCount > 0
              ? `${userAlertCount} alerta${userAlertCount === 1 ? '' : 's'} configurado${userAlertCount === 1 ? '' : 's'} pra esse ativo.`
              : 'Quando o gatilho bater, vamos te avisar no WhatsApp.'}
          </p>
        </Node>
      </ol>
    </div>
  );
}

function Node({ icon, title, meta, chip, children, accent }: {
  icon: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  chip?: string;
  accent: 'ink' | 'up' | 'down' | 'brand' | 'muted';
  children: React.ReactNode;
}) {
  const dotColor =
    accent === 'up'    ? 'bg-up text-white'
    : accent === 'down'  ? 'bg-down text-white'
    : accent === 'brand' ? 'bg-brand text-white'
    : accent === 'muted' ? 'bg-line-strong text-ink-3'
    : 'bg-ink text-bg';

  return (
    <li className="relative flex items-start gap-3">
      <div className={`relative z-10 flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full ring-4 ring-panel ${dotColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-semibold text-ink">{title}</h4>
            {chip && (
              <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">{chip}</code>
            )}
          </div>
          {meta}
        </div>
        <div className="mt-1.5">{children}</div>
      </div>
    </li>
  );
}
