const ZAPI_BASE = 'https://api.z-api.io';

export interface ZapiConfig {
  instanceId: string;
  instanceToken: string;
  clientToken: string;
}

export interface SendTextResult {
  zaapId?: string;
  messageId?: string;
  id?: string;
}

export class ZapiClient {
  constructor(private cfg: ZapiConfig) {
    if (!cfg.instanceId || !cfg.instanceToken || !cfg.clientToken) {
      throw new Error('Z-API config incompleta: instanceId, instanceToken, clientToken obrigatórios');
    }
  }

  private url(path: string) {
    return `${ZAPI_BASE}/instances/${this.cfg.instanceId}/token/${this.cfg.instanceToken}${path}`;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'Client-Token': this.cfg.clientToken
    };
  }

  async sendText(phone: string, message: string): Promise<SendTextResult> {
    const res = await fetch(this.url('/send-text'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone: normalizePhone(phone), message })
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Z-API send-text ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  async configureWebhook(value: string) {
    const res = await fetch(this.url('/webhooks/on-message-received'), {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ value })
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Z-API configure webhook ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  async phoneExists(phone: string): Promise<boolean> {
    const res = await fetch(this.url(`/phone-exists/${normalizePhone(phone)}`), {
      headers: this.headers()
    });
    if (!res.ok) return false;
    const data = await res.json() as { exists?: boolean };
    return !!data.exists;
  }
}

export function normalizePhone(input: string): string {
  // remove tudo que não é dígito; presume formato BR DDI 55 + DDD + número
  const digits = input.replace(/\D+/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export function zapiFromEnv(): ZapiClient {
  return new ZapiClient({
    instanceId: process.env.zapi_instance_id!,
    instanceToken: process.env.zapi_instance_token!,
    clientToken: process.env.zapi_client_token!
  });
}
