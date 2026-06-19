const BRAPI_BASE = 'https://brapi.dev/api';

export type BrapiKind = 'quote' | 'futures' | 'moedas' | 'crypto';

export class BrapiClient {
  constructor(private token: string) {}

  private async get(path: string, query?: Record<string, string>) {
    const url = new URL(`${BRAPI_BASE}${path}`);
    if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`brapi ${path} ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  async fetchPrice(kind: BrapiKind, brapiSymbol: string): Promise<{ price: number; raw: unknown } | null> {
    try {
      switch (kind) {
        case 'quote':
        case 'crypto': {
          const r = await this.get(`/quote/${brapiSymbol}`);
          const p = r.results?.[0]?.regularMarketPrice;
          return p != null ? { price: Number(p), raw: r.results[0] } : null;
        }
        case 'futures': {
          const r = await this.get('/v2/futures/quote', { symbols: brapiSymbol });
          const p = r.results?.[0]?.lastPrice;
          return p != null ? { price: Number(p), raw: r.results[0] } : null;
        }
        case 'moedas': {
          const r = await this.get('/v2/currency', { currency: brapiSymbol });
          const c = r.currency?.[0];
          const p = c?.bidPrice ? parseFloat(c.bidPrice) : null;
          return p != null ? { price: p, raw: c } : null;
        }
      }
    } catch (e) {
      console.error(`brapi fetchPrice ${kind}/${brapiSymbol}:`, (e as Error).message);
      return null;
    }
    return null;
  }
}
