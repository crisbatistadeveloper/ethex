-- Ethex — catálogo compartilhado de imóveis: separa "imóvel" (fato físico,
-- reaproveitável entre clientes) de "curadoria" (relação imóvel × busca de um cliente).

create table imovel (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  fonte text not null,
  preco numeric,
  caracteristicas jsonb not null default '{}'::jsonb,
  latitude numeric,
  longitude numeric,
  endereco_texto text,
  midia_propria jsonb not null default '[]'::jsonb,
  nome_contato text,
  telefone_contato text,
  tipo_contato text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger imovel_set_atualizado_em
  before update on imovel
  for each row execute function set_atualizado_em();

alter table imovel enable row level security;

create policy "authenticated_all_imovel" on imovel
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Backfill: migra os dados hoje presos em imovel_encontrado para o catálogo.
alter table imovel_encontrado add column imovel_id uuid references imovel(id);

insert into imovel (url, fonte, preco, caracteristicas, latitude, longitude, endereco_texto, midia_propria)
select url, fonte, preco, caracteristicas, latitude, longitude, endereco_texto, midia_propria
from imovel_encontrado
on conflict (url) do nothing;

update imovel_encontrado ie
set imovel_id = i.id
from imovel i
where i.url = ie.url;

alter table imovel_encontrado alter column imovel_id set not null;

alter table imovel_encontrado
  drop column fonte,
  drop column url,
  drop column preco,
  drop column caracteristicas,
  drop column latitude,
  drop column longitude,
  drop column endereco_texto,
  drop column midia_propria;

create index imovel_encontrado_imovel_id_idx on imovel_encontrado(imovel_id);
