// Indicadores técnicos puros (funções determinísticas).
// Recebem arrays de preços ordenados ascendente e retornam arrays do
// mesmo tamanho com os primeiros N-1 valores como null.

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    sum += values[i] - values[i - period];
    out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  seed /= period;
  out[period - 1] = seed;
  for (let i = period; i < values.length; i++) {
    out[i] = values[i] * k + (out[i - 1] as number) * (1 - k);
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = 100 - 100 / (1 + avgGain / (avgLoss || 1e-9));

  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = 100 - 100 / (1 + avgGain / (avgLoss || 1e-9));
  }
  return out;
}

export function bollinger(values: number[], period = 20, k = 2): {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
} {
  const middle = sma(values, period);
  const upper: (number | null)[] = new Array(values.length).fill(null);
  const lower: (number | null)[] = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    const m = middle[i];
    if (m == null || i < period - 1) continue;
    let varSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const dv = values[j] - m;
      varSum += dv * dv;
    }
    const std = Math.sqrt(varSum / period);
    upper[i] = m + k * std;
    lower[i] = m - k * std;
  }
  return { middle, upper, lower };
}

/**
 * Correlação de Pearson entre 2 séries pareadas (mesmo tamanho).
 * Retorna valor entre -1 e 1, ou null se variância zero.
 */
export function pearsonCorrelation(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? null : num / denom;
}

export interface RsiClassification { label: string; cls: string; }

export function classifyRsi(value: number | null | undefined): RsiClassification {
  if (value == null || !Number.isFinite(value)) return { label: 'sem dados', cls: 'text-zinc-500' };
  if (value >= 70) return { label: 'sobrecomprado', cls: 'text-rose-600' };
  if (value <= 30) return { label: 'sobrevendido', cls: 'text-emerald-600' };
  return { label: 'neutro', cls: 'text-zinc-700' };
}

export function correlationLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'sem dados';
  const abs = Math.abs(value);
  if (abs >= 0.85) return 'muito forte';
  if (abs >= 0.7)  return 'forte';
  if (abs >= 0.5)  return 'moderada';
  if (abs >= 0.3)  return 'fraca';
  return 'muito fraca';
}

/**
 * Alinha duas séries pelo `time` (unix seconds) e devolve apenas pontos
 * com timestamp em comum (intersecção). Usado pra calcular correlação.
 */
export function alignSeries(
  a: { time: number; price: number }[],
  b: { time: number; price: number }[]
): { times: number[]; a: number[]; b: number[] } {
  const mapB = new Map(b.map((p) => [p.time, p.price]));
  const times: number[] = [];
  const aOut: number[] = [];
  const bOut: number[] = [];
  for (const p of a) {
    const bp = mapB.get(p.time);
    if (bp != null) {
      times.push(p.time);
      aOut.push(p.price);
      bOut.push(bp);
    }
  }
  return { times, a: aOut, b: bOut };
}
