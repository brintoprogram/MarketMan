// Conversões de unidade entre commodities. Tudo derivado de:
// 1 saca (café/grãos) = 60 kg
// 1 arroba (boi)      = 15 kg
// 1 libra (lb)        = 0.45359237 kg
// 1 oz troy           = 31.1034768 g

export const KG_PER_SACA = 60;
export const KG_PER_ARROBA = 15;
export const KG_PER_LB = 0.45359237;
export const LB_PER_SACA = KG_PER_SACA / KG_PER_LB;        // 132.2774
export const LB_PER_ARROBA = KG_PER_ARROBA / KG_PER_LB;    // 33.0693
export const G_PER_OZ_TROY = 31.1034768;

export interface AltPrice {
  value: number;
  unit: string;       // ex: 'BRL/saca 60kg'
  display: string;    // formatted string ex: 'R$ 1.503,88'
  hint?: string;      // micro-texto: 'convertido com USD/BRL atual'
}

/**
 * Dado o preço atual + unit do ativo + USD/BRL atual, retorna conversões úteis.
 * Cobre: café (USD/lb ↔ BRL/saca), algodão (USD/lb ↔ BRL¢/lb ↔ BRL/lb),
 *        ouro (BRL/g ↔ USD/oz), grãos (BRL/saca ↔ USD/saca ↔ USD/lb),
 *        boi (BRL/arroba ↔ USD/arroba ↔ BRL/kg)
 */
export function getAlternateUnits(
  asset: { symbol: string; unit: string | null; category: string; brapi_kind?: string },
  price: number,
  usdBrl: number | null
): AltPrice[] {
  if (!Number.isFinite(price) || price <= 0) return [];
  const out: AltPrice[] = [];
  const unit = asset.unit ?? '';
  const sym = asset.symbol;

  // ===== CAFÉ =====
  // KC=F vem em US¢/lb (ICE NY). brapi devolve em USD/lb (já dividido por 100). Vou tratar como USD/lb.
  // ICF vem em USD/saca 60kg
  // CEPEA_CAFE vem em BRL/saca
  if (sym === 'KC' || (unit === 'USD/lb' && asset.category === 'commodity' && /caf|coffee/i.test(asset.symbol))) {
    // USD/lb → BRL/saca
    if (usdBrl) {
      const brlSaca = price * LB_PER_SACA * usdBrl;
      out.push({ value: brlSaca, unit: 'BRL/saca 60kg', display: fmtBRL(brlSaca), hint: 'via USD×BRL atual' });
      const usdSaca = price * LB_PER_SACA;
      out.push({ value: usdSaca, unit: 'USD/saca 60kg', display: fmtUSD(usdSaca) });
    }
    return out;
  }
  if (sym === 'ICF') {
    // ICF B3 (USD/saca) → BRL/saca + USD/lb
    if (usdBrl) {
      const brlSaca = price * usdBrl;
      out.push({ value: brlSaca, unit: 'BRL/saca 60kg', display: fmtBRL(brlSaca), hint: 'via USD×BRL' });
    }
    out.push({ value: price / LB_PER_SACA, unit: 'USD/lb', display: fmtUSD(price / LB_PER_SACA) });
    return out;
  }
  if (sym === 'CEPEA_CAFE') {
    // BRL/saca → USD/saca + USD/lb
    if (usdBrl) {
      const usdSaca = price / usdBrl;
      out.push({ value: usdSaca, unit: 'USD/saca 60kg', display: fmtUSD(usdSaca), hint: 'via BRL/USD atual' });
      out.push({ value: usdSaca / LB_PER_SACA, unit: 'USD/lb', display: fmtUSD(usdSaca / LB_PER_SACA, 4) });
    }
    return out;
  }

  // ===== ALGODÃO =====
  if (sym === 'CT') {
    // Cotton CT=F em USD/lb (mas brapi pode retornar em cents — verificar)
    // Assumimos USD/lb diretamente.
    if (usdBrl) {
      const brlLb = price * usdBrl;
      out.push({ value: brlLb, unit: 'BRL/lb', display: fmtBRL(brlLb), hint: 'via USD×BRL' });
      out.push({ value: brlLb * 100, unit: 'BRL¢/lb', display: fmtNum(brlLb * 100, 2) + ' ¢' });
    }
    return out;
  }
  if (sym === 'CEPEA_ALGODAO') {
    // CEPEA vem em BRL¢/libra. Converte pra BRL/lb e USD/lb.
    const brlLb = price / 100;
    out.push({ value: brlLb, unit: 'BRL/lb', display: fmtBRL(brlLb) });
    if (usdBrl) {
      const usdLb = brlLb / usdBrl;
      out.push({ value: usdLb, unit: 'USD/lb', display: fmtUSD(usdLb, 4), hint: 'via BRL/USD' });
      out.push({ value: usdLb * 100, unit: 'US¢/lb', display: fmtNum(usdLb * 100, 2) + ' ¢' });
    }
    return out;
  }

  // ===== BOI =====
  if (sym === 'BOI' || sym === 'CEPEA_BOI') {
    // BRL/arroba → BRL/kg + USD/arroba
    out.push({ value: price / KG_PER_ARROBA, unit: 'BRL/kg', display: fmtBRL(price / KG_PER_ARROBA) });
    if (usdBrl) {
      out.push({ value: price / usdBrl, unit: 'USD/arroba', display: fmtUSD(price / usdBrl), hint: 'via BRL/USD' });
    }
    return out;
  }

  // ===== OURO =====
  if (sym === 'GLD') {
    // BRL/grama → USD/grama + USD/oz troy
    if (usdBrl) {
      const usdG = price / usdBrl;
      out.push({ value: usdG, unit: 'USD/grama', display: fmtUSD(usdG), hint: 'via BRL/USD' });
      out.push({ value: usdG * G_PER_OZ_TROY, unit: 'USD/oz troy', display: fmtUSD(usdG * G_PER_OZ_TROY) });
    }
    return out;
  }

  // ===== MILHO, SOJA (B3 em USD/saca) =====
  if (sym === 'CCM' || sym === 'SJC') {
    if (usdBrl) {
      const brlSaca = price * usdBrl;
      out.push({ value: brlSaca, unit: 'BRL/saca 60kg', display: fmtBRL(brlSaca), hint: 'via USD×BRL' });
    }
    return out;
  }
  if (sym === 'CEPEA_MILHO' || sym === 'CEPEA_SOJA') {
    if (usdBrl) {
      const usdSaca = price / usdBrl;
      out.push({ value: usdSaca, unit: 'USD/saca 60kg', display: fmtUSD(usdSaca), hint: 'via BRL/USD' });
    }
    return out;
  }

  // ===== Mini Dólar (já é BRL/USD) =====
  if (sym === 'WDO') {
    // contrato 50.000 USD por contrato — mas preço vem em pontos = BRL × 1000 por USD
    // Não converte
    return out;
  }

  return out;
}

// ===== Formatters =====
export function fmtBRL(n: number, decimals = 2): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export function fmtUSD(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Cálculo de valor total de uma operação
export interface CalcInput {
  asset: { symbol: string; unit: string | null; category: string };
  price: number;       // na unidade do ativo
  quantity: number;    // ex: 100 (sacas), 50 (arrobas), etc
  usdBrl: number | null;
}
export interface CalcResult {
  totalBRL: number | null;
  totalUSD: number | null;
  unitOfQuantity: string;
  perUnit: { brl?: number; usd?: number };
}

export function calculateOperation({ asset, price, quantity, usdBrl }: CalcInput): CalcResult {
  if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
    return { totalBRL: null, totalUSD: null, unitOfQuantity: '?', perUnit: {} };
  }

  const unit = asset.unit ?? '';
  let perUnitBRL: number | null = null;
  let perUnitUSD: number | null = null;
  let unitQty = 'unidade';

  // Café KC=F (USD/lb): qtd em sacas. Total USD = price × LB_PER_SACA × qtd
  if (asset.symbol === 'KC' || (unit === 'USD/lb' && /caf/i.test(asset.symbol))) {
    perUnitUSD = price * LB_PER_SACA;
    if (usdBrl) perUnitBRL = perUnitUSD * usdBrl;
    unitQty = 'saca 60kg';
  } else if (asset.symbol === 'ICF') {
    perUnitUSD = price;
    if (usdBrl) perUnitBRL = price * usdBrl;
    unitQty = 'saca 60kg';
  } else if (asset.symbol === 'CEPEA_CAFE' || asset.symbol === 'CEPEA_MILHO' || asset.symbol === 'CEPEA_SOJA') {
    perUnitBRL = price;
    if (usdBrl) perUnitUSD = price / usdBrl;
    unitQty = 'saca 60kg';
  } else if (asset.symbol === 'CT') {
    perUnitUSD = price;
    if (usdBrl) perUnitBRL = price * usdBrl;
    unitQty = 'libra';
  } else if (asset.symbol === 'CEPEA_ALGODAO') {
    perUnitBRL = price / 100; // ¢ → R$
    if (usdBrl) perUnitUSD = perUnitBRL / usdBrl;
    unitQty = 'libra';
  } else if (asset.symbol === 'BOI' || asset.symbol === 'CEPEA_BOI') {
    perUnitBRL = price;
    if (usdBrl) perUnitUSD = price / usdBrl;
    unitQty = 'arroba';
  } else if (asset.symbol === 'GLD') {
    perUnitBRL = price;
    if (usdBrl) perUnitUSD = price / usdBrl;
    unitQty = 'grama';
  } else if (asset.symbol === 'CCM' || asset.symbol === 'SJC') {
    perUnitUSD = price;
    if (usdBrl) perUnitBRL = price * usdBrl;
    unitQty = 'saca 60kg';
  } else if (asset.symbol === 'USDBRL' || asset.symbol === 'EURBRL') {
    perUnitBRL = price;
    unitQty = asset.symbol === 'USDBRL' ? 'USD' : 'EUR';
  } else if (asset.symbol === 'WDO') {
    perUnitBRL = price / 1000; // pontos → BRL/USD
    unitQty = 'USD';
  } else if (asset.symbol === 'WIN') {
    perUnitBRL = price * 0.2; // 1 ponto = R$ 0,20 no mini
    unitQty = 'ponto';
  }

  return {
    totalBRL: perUnitBRL != null ? perUnitBRL * quantity : null,
    totalUSD: perUnitUSD != null ? perUnitUSD * quantity : null,
    unitOfQuantity: unitQty,
    perUnit: {
      brl: perUnitBRL ?? undefined,
      usd: perUnitUSD ?? undefined
    }
  };
}
