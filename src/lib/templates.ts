// Templates prontos de alertas + relatórios pra reduzir fricção de primeiro uso.
// Cada template aplica N alertas com thresholds sensatos + 1 relatório diário.

export interface TemplateAlert {
  asset_symbol: string;      // será resolvido pelo symbol no momento de criar
  alert_type: 'percentage' | 'price_target';
  threshold_pct?: number;
  comparison_type?: 'last_message' | 'days';
  comparison_days?: number;
  message_template?: string | null;
}

export interface TemplateReport {
  name: string;
  cron_expression: string;
  asset_symbols: string[];
  variations: string[];
  include_volume: boolean;
  include_spread: boolean;
}

export interface Template {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  alerts: TemplateAlert[];
  reports: TemplateReport[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'cafe_arabica',
    emoji: '☕',
    title: 'Trader de café arábica',
    subtitle: 'ICF · KC · CEPEA · USD',
    description: 'Acompanhamento completo do café: futuro B3, referência NY, indicador CEPEA físico e dólar. Variações de 1% no futuro e 2% no físico, fechamento diário.',
    alerts: [
      { asset_symbol: 'ICF',         alert_type: 'percentage', threshold_pct: 1.0, comparison_type: 'last_message' },
      { asset_symbol: 'KC',          alert_type: 'percentage', threshold_pct: 1.5, comparison_type: 'last_message' },
      { asset_symbol: 'CEPEA_CAFE',  alert_type: 'percentage', threshold_pct: 2.0, comparison_type: 'last_message' },
      { asset_symbol: 'USDBRL',      alert_type: 'percentage', threshold_pct: 0.8, comparison_type: 'last_message' }
    ],
    reports: [{
      name: 'Café — fechamento diário',
      cron_expression: '0 21 * * 1-5',     // 18h Brasília dias úteis
      asset_symbols: ['ICF', 'KC', 'CEPEA_CAFE', 'USDBRL'],
      variations: ['1d', '7d', '30d'],
      include_volume: true,
      include_spread: true
    }]
  },
  {
    id: 'algodao',
    emoji: '🌱',
    title: 'Trader de algodão',
    subtitle: 'CT · CEPEA · USD',
    description: 'Cotton ICE NY + indicador físico CEPEA + câmbio. Alertas em 1,5% no futuro e 2% no físico.',
    alerts: [
      { asset_symbol: 'CT',             alert_type: 'percentage', threshold_pct: 1.5, comparison_type: 'last_message' },
      { asset_symbol: 'CEPEA_ALGODAO',  alert_type: 'percentage', threshold_pct: 2.0, comparison_type: 'last_message' },
      { asset_symbol: 'USDBRL',         alert_type: 'percentage', threshold_pct: 0.8, comparison_type: 'last_message' }
    ],
    reports: [{
      name: 'Algodão — fechamento diário',
      cron_expression: '0 21 * * 1-5',
      asset_symbols: ['CT', 'CEPEA_ALGODAO', 'USDBRL'],
      variations: ['1d', '7d', '30d'],
      include_volume: false,
      include_spread: false
    }]
  },
  {
    id: 'graos',
    emoji: '🌾',
    title: 'Produtor de grãos',
    subtitle: 'CCM · SJC · CEPEA · USD',
    description: 'Milho e soja na B3 + indicadores CEPEA físicos + dólar pra travar venda. Alertas em 1,5% no futuro e 2% no físico.',
    alerts: [
      { asset_symbol: 'CCM',          alert_type: 'percentage', threshold_pct: 1.5, comparison_type: 'last_message' },
      { asset_symbol: 'SJC',          alert_type: 'percentage', threshold_pct: 1.5, comparison_type: 'last_message' },
      { asset_symbol: 'CEPEA_MILHO',  alert_type: 'percentage', threshold_pct: 2.0, comparison_type: 'last_message' },
      { asset_symbol: 'CEPEA_SOJA',   alert_type: 'percentage', threshold_pct: 2.0, comparison_type: 'last_message' },
      { asset_symbol: 'USDBRL',       alert_type: 'percentage', threshold_pct: 0.8, comparison_type: 'last_message' }
    ],
    reports: [{
      name: 'Grãos — fechamento diário',
      cron_expression: '0 21 * * 1-5',
      asset_symbols: ['CCM', 'SJC', 'CEPEA_MILHO', 'CEPEA_SOJA', 'USDBRL'],
      variations: ['1d', '7d', '30d'],
      include_volume: true,
      include_spread: true
    }]
  },
  {
    id: 'pecuarista',
    emoji: '🐂',
    title: 'Pecuarista',
    subtitle: 'BOI · CEPEA · USD',
    description: 'Boi gordo B3 + CEPEA físico + câmbio. Alerta em 1% no futuro e 1,5% no físico.',
    alerts: [
      { asset_symbol: 'BOI',       alert_type: 'percentage', threshold_pct: 1.0, comparison_type: 'last_message' },
      { asset_symbol: 'CEPEA_BOI', alert_type: 'percentage', threshold_pct: 1.5, comparison_type: 'last_message' },
      { asset_symbol: 'USDBRL',    alert_type: 'percentage', threshold_pct: 0.8, comparison_type: 'last_message' }
    ],
    reports: [{
      name: 'Pecuária — fechamento diário',
      cron_expression: '0 21 * * 1-5',
      asset_symbols: ['BOI', 'CEPEA_BOI', 'USDBRL'],
      variations: ['1d', '7d', '30d'],
      include_volume: true,
      include_spread: false
    }]
  },
  {
    id: 'macro',
    emoji: '🌎',
    title: 'Trader macro',
    subtitle: 'USD · EUR · WIN · GLD',
    description: 'Câmbio (dólar e euro) + Mini Ibovespa + ouro. Alertas em 0,5%-1% no câmbio e 1,5% nos índices.',
    alerts: [
      { asset_symbol: 'USDBRL', alert_type: 'percentage', threshold_pct: 0.5, comparison_type: 'last_message' },
      { asset_symbol: 'EURBRL', alert_type: 'percentage', threshold_pct: 0.8, comparison_type: 'last_message' },
      { asset_symbol: 'WIN',    alert_type: 'percentage', threshold_pct: 1.5, comparison_type: 'last_message' },
      { asset_symbol: 'GLD',    alert_type: 'percentage', threshold_pct: 1.5, comparison_type: 'last_message' }
    ],
    reports: [{
      name: 'Macro — abertura e fechamento',
      cron_expression: '0 11,21 * * 1-5',  // 8h e 18h Brasília dias úteis
      asset_symbols: ['USDBRL', 'EURBRL', 'WIN', 'GLD'],
      variations: ['1d', '7d'],
      include_volume: false,
      include_spread: false
    }]
  },
  {
    id: 'industria',
    emoji: '🏭',
    title: 'Indústria de bebidas/alimentos',
    subtitle: 'Café · Algodão · Milho · Soja',
    description: 'Comprador de matéria-prima: foco em quedas pra travar compra. Alerta toda vez que cai 2% nos físicos CEPEA.',
    alerts: [
      { asset_symbol: 'KC',             alert_type: 'percentage', threshold_pct: 2.0, comparison_type: 'last_message' },
      { asset_symbol: 'CT',             alert_type: 'percentage', threshold_pct: 2.0, comparison_type: 'last_message' },
      { asset_symbol: 'CEPEA_CAFE',     alert_type: 'percentage', threshold_pct: 2.0, comparison_type: 'last_message' },
      { asset_symbol: 'CEPEA_MILHO',    alert_type: 'percentage', threshold_pct: 2.0, comparison_type: 'last_message' },
      { asset_symbol: 'CEPEA_SOJA',     alert_type: 'percentage', threshold_pct: 2.0, comparison_type: 'last_message' },
      { asset_symbol: 'USDBRL',         alert_type: 'percentage', threshold_pct: 0.8, comparison_type: 'last_message' }
    ],
    reports: [{
      name: 'Matérias-primas — diário',
      cron_expression: '0 11 * * 1-5',     // 8h Brasília dias úteis
      asset_symbols: ['KC', 'CT', 'CEPEA_CAFE', 'CEPEA_MILHO', 'CEPEA_SOJA', 'USDBRL'],
      variations: ['1d', '7d', '30d'],
      include_volume: false,
      include_spread: false
    }]
  }
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
