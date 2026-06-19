const BRAPI_BASE = 'https://brapi.dev/api';

export type BrapiKind = 'quote' | 'futures' | 'moedas' | 'crypto';

export interface BrapiQuoteResult {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
}

export class BrapiClient {
  constructor(private token: string) {
    if (!token) throw new Error('token_brapi não configurado');
  }

  private async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${BRAPI_BASE}${path}`);
    if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: 'no-store'
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`brapi ${path} ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  // /api/quote/PETR4,VALE3 — stocks/ETFs
  async stockQuote(symbols: string[]) {
    return this.get<{ results: BrapiQuoteResult[] }>(`/quote/${symbols.join(',')}`);
  }

  // /api/v2/moedas — moedas suportadas
  async currencyQuote(symbol: string) {
    return this.get<{ currency: Array<{ fromCurrency: string; toCurrency: string; high: string; low: string; bidPrice: string; askPrice: string }> }>(
      '/v2/currency',
      { currency: symbol }
    );
  }

  // /api/v2/futures/quote?symbols=ICF
  async futuresQuote(symbols: string[]) {
    return this.get<{ results: Array<{ symbol: string; lastPrice: number; lastDate: string; currency?: string }> }>(
      '/v2/futures/quote',
      { symbols: symbols.join(',') }
    );
  }

  // /api/v2/futures/historical?symbol=ICF&range=1mo&interval=1d
  async futuresHistorical(symbol: string, range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' = '1mo') {
    return this.get<{ historicalDataPrice: Array<{ date: number; close: number }> }>(
      '/v2/futures/historical',
      { symbol, range, interval: '1d' }
    );
  }

  // Unified fetch — single price by asset config
  async fetchPrice(kind: BrapiKind, brapiSymbol: string): Promise<{ price: number; raw: unknown } | null> {
    switch (kind) {
      case 'quote': {
        const r = await this.stockQuote([brapiSymbol]);
        const p = r.results?.[0]?.regularMarketPrice;
        return p != null ? { price: p, raw: r.results[0] } : null;
      }
      case 'futures': {
        const r = await this.futuresQuote([brapiSymbol]);
        const p = r.results?.[0]?.lastPrice;
        return p != null ? { price: p, raw: r.results[0] } : null;
      }
      case 'moedas': {
        const r = await this.currencyQuote(brapiSymbol);
        const c = r.currency?.[0];
        const p = c?.bidPrice ? parseFloat(c.bidPrice) : null;
        return p != null ? { price: p, raw: c } : null;
      }
      case 'crypto': {
        const r = await this.stockQuote([brapiSymbol]);
        const p = r.results?.[0]?.regularMarketPrice;
        return p != null ? { price: p, raw: r.results[0] } : null;
      }
    }
  }
}
