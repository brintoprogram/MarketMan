# MarketMan

Alertas de cotação no WhatsApp — café arábica, dólar, commodities e futuros.
Define um % de variação e a gente te avisa quando o mercado se mexer.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth + Edge Functions + pg_cron) · brapi.dev · Z-API (WhatsApp)

---

## Como funciona

1. **A cada 15 minutos**, `pg_cron` invoca a Edge Function `fetch-quotes`.
2. `fetch-quotes` busca o preço atual de cada ativo via [brapi.dev](https://brapi.dev) e grava em `quotes`.
3. Depois aciona `process-alerts`, que avalia todos os alertas ativos:
   - Calcula a variação % desde o ponto de comparação (última mensagem ou X dias atrás).
   - Se a variação for ≥ o threshold do usuário, monta a mensagem e envia via Z-API.
   - Registra tudo em `alert_history`.
4. O webhook em `/api/whatsapp-webhook` recebe respostas do WhatsApp e simplesmente **ignora** (HTTP 200, sem reply).

## Deploy na Vercel — variáveis de ambiente

**Project Settings → Environments → Project (ou Shared) → Add Environment Variable.**

Marca todas como **Production + Preview** (Development opcional).

### 🟢 Públicas — Sensitive: NÃO

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tkzvcwbaqkmgasgzrllg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (já tá no [.env.example](./.env.example)) |
| `NEXT_PUBLIC_APP_URL` | URL final do projeto na Vercel (ex: `https://market-man.vercel.app`) |

### 🔴 Secretas — Sensitive: SIM

| Nome | Onde pegar |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | [Supabase → Settings → API → service_role (secret)](https://supabase.com/dashboard/project/tkzvcwbaqkmgasgzrllg/settings/api) |
| `token_brapi` | [brapi.dev](https://brapi.dev) (plano PRO) |
| `zapi_instance_id` | Painel Z-API → lista de instâncias |
| `zapi_instance_token` | Painel Z-API → na mesma tela da instância |
| `zapi_client_token` | Painel Z-API → Conta → Segurança |

> ⚠️ **Z-API tem 3 valores diferentes**, não 1. Se você criou só `token_zapi`, apaga e cria as 3 vars acima.

### Edge Functions secrets (Supabase) — separado da Vercel!

As Edge Functions rodam no Supabase, não na Vercel. Os mesmos secrets precisam existir lá também.

**Dashboard → Edge Functions → Settings → Add new secret.** Cria com os nomes exatos:

- `token_brapi`
- `zapi_instance_id`
- `zapi_instance_token`
- `zapi_client_token`

(`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já vêm injetados automaticamente nas Edge Functions — não precisa criar.)

### Webhook Z-API

Depois do primeiro deploy, configura no painel Z-API → **Configurações → Webhooks → Ao receber mensagens**:

```
https://SEU-DOMINIO-NA-VERCEL/api/whatsapp-webhook
```

## Rodando localmente

```powershell
Copy-Item .env.local.example .env.local
# preenche os valores em .env.local
npm install
npm run dev
```

Abre http://localhost:3000.

## Estrutura

```
src/
├── app/
│   ├── page.tsx                    # landing
│   ├── login/                      # magic link
│   ├── onboarding/                 # cadastra WhatsApp + OTP
│   ├── dashboard/                  # cotações atuais
│   ├── alerts/                     # CRUD de alertas
│   └── api/
│       ├── whatsapp-webhook/       # ignora respostas
│       └── otp/{send,verify}/      # OTP no WhatsApp
├── components/                     # UI + nav + form
└── lib/
    ├── supabase/{client,server,middleware}.ts
    ├── brapi.ts
    ├── zapi.ts
    └── format.ts

supabase/
├── config.toml
├── migrations/
└── functions/
    ├── fetch-quotes/               # cron a cada 15min
    └── process-alerts/             # avalia thresholds + envia WhatsApp
```

## Schema (Postgres)

- `profiles` — perfil do usuário + WhatsApp + OTP
- `assets` — catálogo (café arábica ICF, USDBRL, EURBRL, milho, soja, ouro, boi gordo)
- `quotes` — séries temporais de preço
- `alerts` — configurações de usuário (asset, threshold, comparação)
- `alert_history` — log de notificações disparadas
- `whatsapp_inbox` — log de mensagens recebidas (ignoradas)

## Tipos de comparação

| Tipo | Como funciona |
|---|---|
| `last_message` | Compara com o preço da última mensagem enviada. A cada disparo, o ponto de referência é atualizado. Bom pra alertar a cada variação X% incremental. |
| `days` (7, 30, custom) | Compara com a cotação de N dias atrás. Pode disparar várias vezes seguidas se a variação acumulada continuar crescendo. |

A mensagem inclui sempre o **percentual desde a última mensagem enviada**, mesmo quando a comparação é por dias.

## Mensagem padrão

```
🟢 Café Arábica (B3) subiu +2.34%

Preço atual: $245.30
Referência (a última mensagem): $239.70

— MarketMan
```

Templates personalizados aceitam: `{asset}`, `{symbol}`, `{price}`, `{ref_price}`, `{pct}`, `{ref_label}`, `{since_last_pct}`, `{direction}`.

## Cron status

Já tá agendado: a cada 15min, 24/7. Pra ver execuções:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

## Disparo manual (debug)

```bash
curl -X POST https://tkzvcwbaqkmgasgzrllg.supabase.co/functions/v1/fetch-quotes \
  -H "Authorization: Bearer <NEXT_PUBLIC_SUPABASE_ANON_KEY>"
```

## Próximos passos sugeridos

- [ ] Sparkline 7d no card do dashboard
- [ ] Gráfico histórico na página de detalhes do alerta
- [ ] Alertas de "preço-alvo" (em vez de % variação)
- [ ] Plano pago com limite de alertas
- [ ] Suporte a múltiplos números por usuário (lista de distribuição)
