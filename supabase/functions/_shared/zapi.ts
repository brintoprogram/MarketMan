const ZAPI_BASE = 'https://api.z-api.io';

export interface ZapiConfig {
  instanceId: string;
  instanceToken: string;
  clientToken: string;
}

export class ZapiClient {
  constructor(private cfg: ZapiConfig) {}

  async sendText(phone: string, message: string) {
    const url = `${ZAPI_BASE}/instances/${this.cfg.instanceId}/token/${this.cfg.instanceToken}/send-text`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': this.cfg.clientToken
      },
      body: JSON.stringify({ phone, message })
    });
    const body = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(body); } catch { /* keep raw */ }
    if (!res.ok) {
      throw new Error(`Z-API ${res.status}: ${body.slice(0, 300)}`);
    }
    return parsed ?? {};
  }
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D+/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}
