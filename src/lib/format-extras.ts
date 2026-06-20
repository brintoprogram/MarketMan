// Formatters complementares pra Volume, contagens grandes, etc.

export function formatVolumeBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `R$ ${(n / 1e3).toFixed(2)}K`;
  return `R$ ${n.toFixed(2)}`;
}

export function formatCount(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export interface SpreadStructure {
  label: string;
  variant: 'success' | 'danger' | 'muted';
  hint: string;
}

export function describeSpread(spreadValue: number | null | undefined): SpreadStructure {
  if (spreadValue == null || !Number.isFinite(spreadValue)) {
    return { label: 'sem dados', variant: 'muted', hint: '' };
  }
  if (spreadValue > 0) {
    return {
      label: 'contango',
      variant: 'success',
      hint: 'Vencimento mais distante está acima do mais próximo — típico de mercado abastecido / custo de carregamento positivo'
    };
  }
  if (spreadValue < 0) {
    return {
      label: 'backwardation',
      variant: 'danger',
      hint: 'Vencimento mais próximo está acima do mais distante — escassez no curto prazo / demanda física forte'
    };
  }
  return { label: 'flat', variant: 'muted', hint: 'Sem diferença significativa entre vencimentos' };
}
