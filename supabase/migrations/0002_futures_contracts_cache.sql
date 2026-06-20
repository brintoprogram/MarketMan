-- Cache local dos contratos futuros da brapi.dev.
-- A API /v2/futures/list aceita no máximo limit=100, e existem 1716 contratos.
-- Pra não estourar rate limit a cada coleta, paginamos uma vez por dia e cacheamos aqui.
-- O cron pg_cron 'marketman-refresh-futures-contracts' dispara a Edge Function
-- refresh-futures-contracts às 5h da manhã, que popula esta tabela.

create table if not exists public.futures_contracts (
  symbol text primary key,                  -- ex: 'ICFN26' (café julho/2026)
  underlying_asset text not null,           -- ex: 'ICF' (root genérico)
  expiration_date date,
  asset_description text,
  quotation_type text,
  raw jsonb,
  refreshed_at timestamptz not null default now()
);

create index if not exists futures_contracts_underlying_idx
  on public.futures_contracts (underlying_asset, expiration_date);
create index if not exists futures_contracts_refreshed_idx
  on public.futures_contracts (refreshed_at desc);

alter table public.futures_contracts enable row level security;
create policy "futures_contracts_authenticated_read" on public.futures_contracts
  for select to authenticated using (true);

-- Front-month = próximo contrato com vencimento >= hoje.
-- Letras dos meses (padrão ICE/B3): F=jan G=fev H=mar J=abr K=mai M=jun
--                                   N=jul Q=ago U=set V=out X=nov Z=dez
create or replace function public.get_front_month_contract(p_root text)
returns text
language sql stable
as $$
  select symbol
    from public.futures_contracts
   where underlying_asset = p_root
     and expiration_date >= current_date
   order by expiration_date asc
   limit 1;
$$;

grant execute on function public.get_front_month_contract(text) to service_role, authenticated;
