// Tipos compartilhados do editor de fluxos.

export type TriggerKind =
  | 'trigger.price_variation'    // ativo subiu/caiu ≥ X%
  | 'trigger.price_target';      // ativo cruzou um preço-alvo

export type ActionKind =
  | 'action.send_message'        // envia mensagem custom pra destinatários
  | 'action.send_report';        // dispara um relatório agendado existente

export type NodeKind = TriggerKind | ActionKind;

export interface TriggerVariationData {
  kind: 'trigger.price_variation';
  asset_id: string | null;
  threshold_pct: number;                                   // ≥ X%
  comparison: 'last_message' | '7d' | '30d';
}

export interface TriggerTargetData {
  kind: 'trigger.price_target';
  asset_id: string | null;
  target_price: number;
  direction: 'above' | 'below' | 'crosses';
}

export interface ActionMessageData {
  kind: 'action.send_message';
  recipient_ids: string[];      // vazio = self
  message: string;              // template (com {asset}, {price}, {pct})
}

export interface ActionReportData {
  kind: 'action.send_report';
  report_id: string | null;     // dispara um scheduled_report existente
}

export type FlowNodeData =
  | TriggerVariationData
  | TriggerTargetData
  | ActionMessageData
  | ActionReportData;

export interface FlowGraph {
  nodes: Array<{
    id: string;
    type: 'trigger' | 'action';
    position: { x: number; y: number };
    data: FlowNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

export const NODE_LABELS: Record<NodeKind, string> = {
  'trigger.price_variation': 'Variação de preço',
  'trigger.price_target':    'Preço-alvo',
  'action.send_message':     'Enviar mensagem',
  'action.send_report':      'Disparar relatório'
};

export const NODE_DESCRIPTIONS: Record<NodeKind, string> = {
  'trigger.price_variation': 'Avalia variação % desde o último ping ou um período.',
  'trigger.price_target':    'Avalia se o preço cruzou um valor absoluto.',
  'action.send_message':     'Envia mensagem custom pra destinatários selecionados.',
  'action.send_report':      'Executa um relatório agendado que você já configurou.'
};

export function emptyDataFor(kind: NodeKind): FlowNodeData {
  switch (kind) {
    case 'trigger.price_variation':
      return { kind, asset_id: null, threshold_pct: 1, comparison: 'last_message' };
    case 'trigger.price_target':
      return { kind, asset_id: null, target_price: 0, direction: 'above' };
    case 'action.send_message':
      return { kind, recipient_ids: [], message: '' };
    case 'action.send_report':
      return { kind, report_id: null };
  }
}

export function isTrigger(kind: NodeKind): kind is TriggerKind {
  return kind.startsWith('trigger.');
}
