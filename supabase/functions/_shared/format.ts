export function fmtPrice(value: number, unit?: string | null): string {
  const usd = unit?.includes('USD');
  return value.toLocaleString(usd ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency: usd ? 'USD' : 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

export function fmtPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function arrow(value: number): string {
  if (value > 0) return '🟢';
  if (value < 0) return '🔴';
  return '⚪';
}
