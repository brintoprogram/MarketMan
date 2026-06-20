-- Adiciona ICE NY (café KC, algodão CT), corrige ouro (OZ1 → GLD) e
-- adiciona 5 indicadores físicos via CEPEA/ESALQ (republicados pelo
-- NoticiasAgricolas.com.br e acessados via Jina Reader r.jina.ai).

-- 1. amplia constraint do brapi_kind pra incluir 'cepea' (físico via scrape)
alter table public.assets
  drop constraint if exists assets_brapi_kind_check;
alter table public.assets
  add constraint assets_brapi_kind_check
  check (brapi_kind in ('quote','futures','moedas','crypto','cepea'));

-- 2. corrige ouro: OZ1 (não existe na brapi) → GLD (Futuro Ouro Fino B3)
update public.assets
   set symbol = 'GLD',
       brapi_symbol = 'GLD',
       active = true,
       description = 'Contrato futuro de ouro fino na B3 (250g)',
       unit = 'BRL/grama'
 where symbol = 'OZ1';

-- 3. adiciona ICE NY (Café KC, Algodão CT) via brapi quote endpoint (ticker Yahoo)
insert into public.assets
  (symbol, name, category, brapi_kind, brapi_symbol, unit, description, display_order, active) values
  ('KC',  'Café Arábica (ICE NY)', 'commodity', 'quote', 'KC=F',  'USD/lb', 'Coffee C Futures — referência mundial do café arábica (ICE NY)', 10, true),
  ('CT',  'Algodão (ICE NY)',      'commodity', 'quote', 'CT=F',  'USD/lb', 'Cotton No.2 Futures — referência mundial do algodão (ICE NY)',   11, true)
on conflict (symbol) do nothing;

-- 4. adiciona CEPEA (indicadores físicos)
insert into public.assets
  (symbol, name, category, brapi_kind, brapi_symbol, unit, description, display_order, active) values
  ('CEPEA_CAFE',    'Café Arábica (CEPEA físico)',  'commodity', 'cepea', 'cafe',     'BRL/saca 60kg', 'Indicador CEPEA/ESALQ — preço físico de balcão do café arábica',     12, true),
  ('CEPEA_ALGODAO', 'Algodão (CEPEA físico)',       'commodity', 'cepea', 'algodao',  'BRL¢/libra',    'Indicador CEPEA/ESALQ do algodão em pluma — preço físico (R$ centavos/libra-peso)', 13, true),
  ('CEPEA_MILHO',   'Milho (CEPEA físico)',         'commodity', 'cepea', 'milho',    'BRL/saca 60kg', 'Indicador CEPEA/ESALQ — preço físico de balcão do milho',            14, true),
  ('CEPEA_SOJA',    'Soja (CEPEA físico)',          'commodity', 'cepea', 'soja',     'BRL/saca 60kg', 'Indicador CEPEA/ESALQ — preço físico da soja',                       15, true),
  ('CEPEA_BOI',     'Boi Gordo (CEPEA físico)',     'commodity', 'cepea', 'boi',      'BRL/arroba',    'Indicador CEPEA/ESALQ — preço físico do boi gordo',                   16, true)
on conflict (symbol) do nothing;

-- 5. agenda fetch-cepea: 19h Brasília (22h UTC) dias úteis
--    via pg_net (CEPEA atualiza por volta das 18h30)
-- select cron.schedule('marketman-fetch-cepea-evening', '0 22 * * 1-5', $$...$$);
