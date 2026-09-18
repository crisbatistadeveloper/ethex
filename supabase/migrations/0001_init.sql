-- Ethex — Fase 1: schema inicial (cliente, perfil, busca, imovel_encontrado)

create extension if not exists "pgcrypto";

create type finalidade_enum as enum (
  'moradia',
  'investimento',
  'temporada',
  'sucessorio',
  'comercial',
  'institucional',
  'outro'
);

create type cliente_status_enum as enum (
  'em_entrevista',
  'em_busca',
  'em_curadoria',
  'fechado'
);

create type busca_status_enum as enum (
  'pendente',
  'rodando',
  'concluida',
  'erro'
);

create type curadoria_status_enum as enum (
  'pendente',
  'aprovado',
  'rejeitado'
);

create table cliente (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  origem_lead text,
  status cliente_status_enum not null default 'em_entrevista',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table perfil (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null unique references cliente(id) on delete cascade,
  finalidade finalidade_enum not null,
  orcamento_min numeric,
  orcamento_max numeric,
  tem_entrada boolean,
  credito_aprovado boolean,
  regioes_aceitas jsonb not null default '[]'::jsonb,
  tipo_imovel text,
  quartos_min int,
  vagas_min int,
  prazo_compra text,
  motivacao text,
  aspiracoes text,
  restricoes text,
  criterios_priorizados jsonb not null default '[]'::jsonb,
  detalhes_finalidade jsonb not null default '{}'::jsonb,
  entrevista_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create table busca (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfil(id) on delete cascade,
  disparada_em timestamptz not null default now(),
  status busca_status_enum not null default 'pendente'
);

create table imovel_encontrado (
  id uuid primary key default gen_random_uuid(),
  busca_id uuid not null references busca(id) on delete cascade,
  fonte text not null,
  url text not null,
  preco numeric,
  caracteristicas jsonb not null default '{}'::jsonb,
  score numeric,
  status_curadoria curadoria_status_enum not null default 'pendente'
);

create index perfil_cliente_id_idx on perfil(cliente_id);
create index busca_perfil_id_idx on busca(perfil_id);
create index imovel_encontrado_busca_id_idx on imovel_encontrado(busca_id);

-- atualizado_em automatico
create or replace function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger cliente_set_atualizado_em
  before update on cliente
  for each row execute function set_atualizado_em();

create trigger perfil_set_atualizado_em
  before update on perfil
  for each row execute function set_atualizado_em();

-- RLS: modelo single-tenant/single-admin — qualquer usuário autenticado tem acesso total
alter table cliente enable row level security;
alter table perfil enable row level security;
alter table busca enable row level security;
alter table imovel_encontrado enable row level security;

create policy "authenticated_all_cliente" on cliente
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_perfil" on perfil
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_busca" on busca
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_imovel_encontrado" on imovel_encontrado
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
