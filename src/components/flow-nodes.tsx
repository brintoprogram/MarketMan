'use client';

// Nós custom do ReactFlow renderizados com a linguagem visual nova.
// Trigger = ícone Zap em brand-soft. Action = ícone Send em panel-2.

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap, Send, FileText, Target, AlertCircle } from 'lucide-react';
import type { FlowNodeData, NodeKind } from '@/lib/flow-types';
import { NODE_LABELS } from '@/lib/flow-types';

function NodeShell({
  kind, title, body, selected, isTrigger
}: {
  kind: NodeKind;
  title: string;
  body: React.ReactNode;
  selected?: boolean;
  isTrigger: boolean;
}) {
  const icon =
    kind === 'trigger.price_variation' ? <Zap className="h-3.5 w-3.5" />
    : kind === 'trigger.price_target'  ? <Target className="h-3.5 w-3.5" />
    : kind === 'action.send_message'   ? <Send className="h-3.5 w-3.5" />
    : kind === 'action.send_report'    ? <FileText className="h-3.5 w-3.5" />
    : <AlertCircle className="h-3.5 w-3.5" />;

  const eyebrow = isTrigger ? 'TRIGGER' : 'AÇÃO';
  const eyebrowColor = isTrigger ? 'text-brand-ink' : 'text-ink-3';

  return (
    <div
      className={`w-[240px] rounded-md border bg-panel shadow-card transition ${
        selected ? 'border-brand ring-2 ring-brand-soft' : 'border-line'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded ${isTrigger ? 'bg-brand-soft text-brand-ink' : 'bg-panel-2 text-ink-2'}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${eyebrowColor}`}>
            {eyebrow}
          </div>
          <div className="truncate text-[12.5px] font-semibold text-ink">{title}</div>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2">
        {body}
      </div>

      {/* Handles ReactFlow */}
      {isTrigger ? (
        <Handle
          type="source" position={Position.Right}
          className="!h-2 !w-2 !border-2 !border-panel !bg-brand"
        />
      ) : (
        <Handle
          type="target" position={Position.Left}
          className="!h-2 !w-2 !border-2 !border-panel !bg-brand"
        />
      )}
    </div>
  );
}

function fmtPrice(value: number | null | undefined, unit?: string | null) {
  if (value == null) return '—';
  const usd = unit?.includes('USD');
  return value.toLocaleString(usd ? 'en-US' : 'pt-BR', {
    style: 'currency', currency: usd ? 'USD' : 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 4
  });
}

interface CustomNodeMeta {
  assetLabel?: string;
  unit?: string | null;
  recipientLabels?: string[];
  reportLabel?: string;
}

export function TriggerNode(props: NodeProps) {
  const data = props.data as unknown as FlowNodeData & CustomNodeMeta;
  const title = NODE_LABELS[data.kind];

  let body: React.ReactNode = <span className="text-ink-3">configure este nó →</span>;

  if (data.kind === 'trigger.price_variation') {
    body = (
      <div className="space-y-1">
        <div className="text-ink-2">
          {data.assetLabel ? <strong className="text-ink">{data.assetLabel}</strong> : 'Selecione o ativo'}
        </div>
        <div>
          variar <span className="num font-semibold text-ink">≥ {data.threshold_pct}%</span>
          <span className="text-ink-3"> · {data.comparison === 'last_message' ? 'desde última msg' : data.comparison === '7d' ? '7 dias' : '30 dias'}</span>
        </div>
      </div>
    );
  } else if (data.kind === 'trigger.price_target') {
    const dirLabel = data.direction === 'above' ? 'subir acima' : data.direction === 'below' ? 'cair abaixo' : 'cruzar';
    body = (
      <div className="space-y-1">
        <div className="text-ink-2">
          {data.assetLabel ? <strong className="text-ink">{data.assetLabel}</strong> : 'Selecione o ativo'}
        </div>
        <div>
          {dirLabel} de <span className="num font-semibold text-ink">{fmtPrice(data.target_price, data.unit)}</span>
        </div>
      </div>
    );
  }

  return <NodeShell kind={data.kind} title={title} body={body} selected={props.selected} isTrigger />;
}

export function ActionNode(props: NodeProps) {
  const data = props.data as unknown as FlowNodeData & CustomNodeMeta;
  const title = NODE_LABELS[data.kind];

  let body: React.ReactNode = <span className="text-ink-3">configure este nó →</span>;

  if (data.kind === 'action.send_message') {
    const recipients = data.recipient_ids ?? [];
    const labels = data.recipientLabels ?? [];
    body = (
      <div className="space-y-1">
        <div className="text-ink-2">
          pra <strong className="text-ink">{recipients.length === 0 ? 'você' : `${recipients.length} destinatário${recipients.length === 1 ? '' : 's'}`}</strong>
        </div>
        {labels.length > 0 && (
          <div className="truncate text-ink-3">{labels.join(' · ')}</div>
        )}
        <div className="truncate text-ink-3">
          {data.message ? <em>“{data.message.slice(0, 40)}{data.message.length > 40 ? '…' : ''}”</em> : 'mensagem padrão'}
        </div>
      </div>
    );
  } else if (data.kind === 'action.send_report') {
    body = (
      <div>
        {data.reportLabel ? (
          <>dispara <strong className="text-ink">{data.reportLabel}</strong></>
        ) : (
          <span className="text-ink-3">selecione um relatório</span>
        )}
      </div>
    );
  }

  return <NodeShell kind={data.kind} title={title} body={body} selected={props.selected} isTrigger={false} />;
}

export const NODE_TYPES = {
  trigger: TriggerNode,
  action: ActionNode
};
