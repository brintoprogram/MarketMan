'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type Connection,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toast';
import { NODE_TYPES } from '@/components/flow-nodes';
import {
  NODE_LABELS, emptyDataFor, isTrigger,
  type NodeKind, type FlowNodeData, type TriggerVariationData,
  type TriggerTargetData, type ActionMessageData, type ActionReportData
} from '@/lib/flow-types';
import { Zap, Send, Target, FileText, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export interface FlowAsset { id: string; symbol: string; name: string; unit: string | null; }
export interface FlowRecipient { id: string; name: string; is_self: boolean; }
export interface FlowReport { id: string; name: string; }

interface Props {
  initial?: {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    graph: { nodes: any[]; edges: any[] };
  };
  assets: FlowAsset[];
  recipients: FlowRecipient[];
  reports: FlowReport[];
}

const PALETTE: { kind: NodeKind; icon: React.ComponentType<{ className?: string }> }[] = [
  { kind: 'trigger.price_variation', icon: Zap },
  { kind: 'trigger.price_target',    icon: Target },
  { kind: 'action.send_message',     icon: Send },
  { kind: 'action.send_report',      icon: FileText }
];

let idCounter = 1;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

function defaultGraph() {
  return {
    nodes: [
      {
        id: 'trigger-default',
        type: 'trigger',
        position: { x: 80, y: 140 },
        data: emptyDataFor('trigger.price_variation')
      },
      {
        id: 'action-default',
        type: 'action',
        position: { x: 460, y: 140 },
        data: emptyDataFor('action.send_message')
      }
    ],
    edges: [
      { id: 'e-default', source: 'trigger-default', target: 'action-default' }
    ]
  };
}

export function FlowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

function FlowEditorInner({ initial, assets, recipients, reports }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? 'Novo fluxo');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);

  const initialGraph = initial?.graph ?? defaultGraph();

  // enriquecemos os data dos nós com labels resolvidos pra exibição
  function enrichNode(n: any): Node {
    const data: any = { ...n.data };
    if (data.asset_id) {
      const a = assets.find((x) => x.id === data.asset_id);
      data.assetLabel = a ? `${a.symbol} · ${a.name}` : null;
      data.unit = a?.unit ?? null;
    }
    if (data.recipient_ids) {
      data.recipientLabels = data.recipient_ids
        .map((id: string) => recipients.find((r) => r.id === id)?.name)
        .filter(Boolean);
    }
    if (data.report_id) {
      data.reportLabel = reports.find((r) => r.id === data.report_id)?.name ?? null;
    }
    return { ...n, data };
  }

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    initialGraph.nodes.map(enrichNode)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialGraph.edges.map((e: any) => ({ ...e, style: { stroke: 'var(--brand)', strokeWidth: 1.5 } }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId]
  );

  const onConnect = useCallback(
    (conn: Connection) => setEdges((eds) => addEdge(
      { ...conn, id: nextId('edge'), style: { stroke: 'var(--brand)', strokeWidth: 1.5 } },
      eds
    )),
    [setEdges]
  );

  function addNode(kind: NodeKind) {
    const isTrig = isTrigger(kind);
    const newId = nextId(isTrig ? 'trigger' : 'action');
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        type: isTrig ? 'trigger' : 'action',
        position: { x: isTrig ? 80 : 460, y: 200 + Math.random() * 100 },
        data: emptyDataFor(kind)
      } as any
    ]);
    setSelectedId(newId);
  }

  function updateSelectedData(patch: Partial<FlowNodeData>) {
    if (!selectedId) return;
    setNodes((nds) => nds.map((n) => {
      if (n.id !== selectedId) return n;
      // mantém enriquecimento
      const data = { ...n.data, ...patch } as any;
      if ('asset_id' in patch) {
        const a = assets.find((x) => x.id === patch.asset_id);
        data.assetLabel = a ? `${a.symbol} · ${a.name}` : null;
        data.unit = a?.unit ?? null;
      }
      if ('recipient_ids' in patch) {
        data.recipientLabels = (patch.recipient_ids as string[] ?? [])
          .map((id) => recipients.find((r) => r.id === id)?.name)
          .filter(Boolean);
      }
      if ('report_id' in patch) {
        data.reportLabel = reports.find((r) => r.id === patch.report_id)?.name ?? null;
      }
      return { ...n, data };
    }));
  }

  function deleteSelected() {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  }

  async function save() {
    setSaving(true);
    const supa = createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { setSaving(false); toast.error('Sessão expirada', 'Faça login de novo'); return; }

    // serializa removendo os campos enriquecidos (labels)
    const graph = {
      nodes: nodes.map((n) => {
        const { assetLabel, recipientLabels, reportLabel, unit, ...payload } = n.data as any;
        return { id: n.id, type: n.type, position: n.position, data: payload };
      }),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
    };

    const payload = {
      user_id: user.id,
      name: name.trim() || 'Fluxo sem nome',
      description: description.trim() || null,
      active,
      graph
    };

    const result = initial
      ? await supa.from('flows').update(payload).eq('id', initial.id)
      : await supa.from('flows').insert(payload);

    setSaving(false);
    if (result.error) { toast.error('Não consegui salvar', result.error.message); return; }
    toast.success(initial ? 'Fluxo atualizado' : 'Fluxo criado', name);
    router.push('/flows');
    router.refresh();
  }

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col">
      {/* Toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-5 py-3">
        <div className="flex flex-1 items-center gap-3">
          <Link href="/flows" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-3 transition hover:bg-panel-2 hover:text-ink" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="num w-full max-w-md bg-transparent text-[16px] font-bold tracking-[-0.01em] text-ink outline-none placeholder:text-ink-3 focus:outline-none"
              placeholder="Nome do fluxo"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full max-w-md bg-transparent text-[12px] text-ink-2 outline-none placeholder:text-ink-3"
              placeholder="Descrição (opcional)"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-[11.5px] font-medium text-ink-2 transition hover:bg-panel-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-[color:var(--brand)]"
            />
            Ativo
          </label>
          <Button onClick={save} variant="brand" size="sm" disabled={saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </header>

      {/* Body: canvas + side panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Paleta esquerda */}
        <aside className="w-[200px] flex-shrink-0 border-r border-line bg-panel-2/40 p-3">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Adicionar nó
          </div>
          <div className="space-y-1.5">
            {PALETTE.map(({ kind, icon: Icon }) => {
              const trig = isTrigger(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addNode(kind)}
                  className="card-hover flex w-full items-center gap-2 rounded-md border border-line bg-panel px-2.5 py-2 text-left text-[12px] transition hover:border-brand"
                >
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded ${trig ? 'bg-brand-soft text-brand-ink' : 'bg-panel-2 text-ink-2'}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{NODE_LABELS[kind]}</div>
                    <div className="text-[9.5px] uppercase tracking-wider text-ink-3">
                      {trig ? 'trigger' : 'ação'}
                    </div>
                  </div>
                  <Plus className="h-3 w-3 flex-shrink-0 text-ink-3" />
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-md border border-line bg-panel p-2.5 text-[10.5px] leading-relaxed text-ink-3">
            <strong className="text-ink-2">Dica:</strong> arraste do círculo do trigger até o ação pra conectar.
            Um trigger pode disparar várias ações.
          </div>
        </aside>

        {/* Canvas */}
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ style: { stroke: 'var(--brand)', strokeWidth: 1.5 } }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--line-strong)" />
            <Controls className="!bg-panel !border-line" />
          </ReactFlow>
        </div>

        {/* Side panel direita */}
        {selectedNode && (
          <aside className="w-[300px] flex-shrink-0 overflow-y-auto border-l border-line bg-panel p-4">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
              Editar nó
            </div>
            <h3 className="mb-3 text-[15px] font-semibold text-ink">
              {NODE_LABELS[(selectedNode.data as any).kind as NodeKind]}
            </h3>

            <NodeForm
              data={selectedNode.data as any}
              assets={assets}
              recipients={recipients}
              reports={reports}
              onChange={updateSelectedData}
            />

            <div className="mt-5 border-t border-line pt-3">
              <button
                type="button"
                onClick={deleteSelected}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-down transition hover:text-down/80"
              >
                <Trash2 className="h-3 w-3" />
                Remover nó
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* =========================== Formulários por tipo =========================== */

function NodeForm({ data, assets, recipients, reports, onChange }: {
  data: FlowNodeData;
  assets: FlowAsset[];
  recipients: FlowRecipient[];
  reports: FlowReport[];
  onChange: (patch: Partial<FlowNodeData>) => void;
}) {
  if (data.kind === 'trigger.price_variation') return <FormVariation data={data} assets={assets} onChange={onChange as any} />;
  if (data.kind === 'trigger.price_target')    return <FormTarget data={data} assets={assets} onChange={onChange as any} />;
  if (data.kind === 'action.send_message')     return <FormMessage data={data} recipients={recipients} onChange={onChange as any} />;
  if (data.kind === 'action.send_report')      return <FormReport data={data} reports={reports} onChange={onChange as any} />;
  return null;
}

function FormVariation({ data, assets, onChange }: {
  data: TriggerVariationData;
  assets: FlowAsset[];
  onChange: (p: Partial<TriggerVariationData>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Ativo</Label>
        <Select value={data.asset_id ?? ''} onChange={(e) => onChange({ asset_id: e.target.value || null })}>
          <option value="">— escolha —</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol} · {a.name}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Variação mínima (%)</Label>
        <Input
          type="number" step="0.1" min={0.1} max={100}
          value={data.threshold_pct}
          onChange={(e) => onChange({ threshold_pct: parseFloat(e.target.value) || 0 })}
          className="num"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Comparar com</Label>
        <Select value={data.comparison} onChange={(e) => onChange({ comparison: e.target.value as any })}>
          <option value="last_message">Desde última mensagem</option>
          <option value="7d">7 dias atrás</option>
          <option value="30d">30 dias atrás</option>
        </Select>
      </div>
    </div>
  );
}

function FormTarget({ data, assets, onChange }: {
  data: TriggerTargetData;
  assets: FlowAsset[];
  onChange: (p: Partial<TriggerTargetData>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Ativo</Label>
        <Select value={data.asset_id ?? ''} onChange={(e) => onChange({ asset_id: e.target.value || null })}>
          <option value="">— escolha —</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol} · {a.name}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Preço-alvo</Label>
        <Input
          type="number" step="any" min={0}
          value={data.target_price}
          onChange={(e) => onChange({ target_price: parseFloat(e.target.value) || 0 })}
          className="num"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Direção</Label>
        <Select value={data.direction} onChange={(e) => onChange({ direction: e.target.value as any })}>
          <option value="above">Subir acima</option>
          <option value="below">Cair abaixo</option>
          <option value="crosses">Cruzar (ambas)</option>
        </Select>
      </div>
    </div>
  );
}

function FormMessage({ data, recipients, onChange }: {
  data: ActionMessageData;
  recipients: FlowRecipient[];
  onChange: (p: Partial<ActionMessageData>) => void;
}) {
  function toggleRecipient(id: string) {
    const next = data.recipient_ids.includes(id)
      ? data.recipient_ids.filter((x) => x !== id)
      : [...data.recipient_ids, id];
    onChange({ recipient_ids: next });
  }
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Mensagem</Label>
        <textarea
          rows={4}
          value={data.message}
          onChange={(e) => onChange({ message: e.target.value })}
          placeholder="Ex: 🟢 {asset} subiu {pct}!"
          className="block w-full rounded-md border border-line-strong bg-panel px-3 py-2 text-[12.5px] leading-relaxed text-ink shadow-[inset_0_1px_0_rgba(0,0,0,.02)] placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
        />
        <p className="text-[10.5px] text-ink-3">
          Variáveis disponíveis: <code className="num">{'{asset}'}</code> <code className="num">{'{price}'}</code> <code className="num">{'{pct}'}</code>
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Destinatários</Label>
        {recipients.length === 0 ? (
          <p className="text-[11px] text-ink-3">Cadastre destinatários em /recipients.</p>
        ) : (
          <div className="space-y-1">
            {recipients.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-panel-2/40 px-2.5 py-1.5 text-[12px]">
                <input
                  type="checkbox"
                  checked={data.recipient_ids.includes(r.id)}
                  onChange={() => toggleRecipient(r.id)}
                  className="accent-[color:var(--brand)]"
                />
                <span className="text-ink">{r.name}</span>
                {r.is_self && <span className="text-[10px] text-ink-3">(você)</span>}
              </label>
            ))}
            <p className="text-[10.5px] text-ink-3">Vazio = manda só pra você.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FormReport({ data, reports, onChange }: {
  data: ActionReportData;
  reports: FlowReport[];
  onChange: (p: Partial<ActionReportData>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Relatório</Label>
        {reports.length === 0 ? (
          <p className="text-[11px] text-ink-3">Você ainda não tem relatórios. Crie um em /reports/new primeiro.</p>
        ) : (
          <Select value={data.report_id ?? ''} onChange={(e) => onChange({ report_id: e.target.value || null })}>
            <option value="">— escolha —</option>
            {reports.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        )}
      </div>
      <p className="text-[10.5px] text-ink-3">
        Quando o trigger casar, o relatório é disparado imediatamente (não respeita o cron dele).
      </p>
    </div>
  );
}
