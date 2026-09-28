-- Ethex — Escolha do imóvel e início da negociação de compra
-- decisao_imovel: decisão do cliente sobre um imóvel da curadoria, por oportunidade
--   (no máximo um "escolhido" por oportunidade).
-- negociacao_compra: processo comercial do cliente (≠ negociacao_parceria, que é a
--   comissão com o parceiro). Não sobrescreve imovel.preco.
-- negociacao_compra_evento: timeline imutável (só select/insert).
-- NÃO altera etapa da oportunidade (etapa "negociacao" já existe; avanço manual).
-- Requer 0014. Aplicar só no ethex-dev.

-- ---------------------------------------------------------------------------
-- Decisão do cliente
-- ---------------------------------------------------------------------------

create type decisao_imovel_status as enum (
  'em_consideracao',
  'escolhido',
  'descartado'
);

create table decisao_imovel (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references oportunidade(id) on delete cascade,
  imovel_encontrado_id uuid not null references imovel_encontrado(id) on delete cascade,
  decisao decisao_imovel_status not null,
  observacao text,
  consultor_id uuid not null references usuario(id),
  decidido_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (oportunidade_id, imovel_encontrado_id)
);

create unique index decisao_imovel_um_escolhido_por_oportunidade
  on decisao_imovel(oportunidade_id)
  where decisao = 'escolhido';

create index decisao_imovel_ie_idx on decisao_imovel(imovel_encontrado_id);

create trigger decisao_imovel_set_atualizado_em
  before update on decisao_imovel
  for each row execute function set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Negociação de compra
-- ---------------------------------------------------------------------------

create type negociacao_compra_status as enum (
  'iniciada',
  'proposta_enviada',
  'contraproposta',
  'aceita',
  'recusada',
  'cancelada'
);

create table negociacao_compra (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references oportunidade(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  imovel_id uuid not null references imovel(id) on delete cascade,
  imovel_encontrado_id uuid not null references imovel_encontrado(id) on delete cascade,
  parceiro_id uuid references parceiro(id) on delete set null,
  consultor_id uuid not null references usuario(id),
  status negociacao_compra_status not null default 'iniciada',
  -- Preço do anúncio no momento do início (catálogo continua intacto)
  preco_anunciado numeric,
  -- Últimos valores de cada tipo (a timeline guarda todos)
  valor_proposta numeric,
  valor_contraproposta numeric,
  valor_final numeric,
  observacoes text,
  proxima_acao text,
  proxima_acao_em date,
  iniciada_em timestamptz not null default now(),
  encerrada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Uma negociação ativa por oportunidade
create unique index negociacao_compra_uma_ativa_por_oportunidade
  on negociacao_compra(oportunidade_id)
  where status in ('iniciada', 'proposta_enviada', 'contraproposta');

create index negociacao_compra_ie_idx on negociacao_compra(imovel_encontrado_id);
create index negociacao_compra_cliente_idx on negociacao_compra(cliente_id);

create trigger negociacao_compra_set_atualizado_em
  before update on negociacao_compra
  for each row execute function set_atualizado_em();

comment on table negociacao_compra is
  'Negociação de compra do cliente para um imóvel. Não confundir com negociacao_parceria (comissão com parceiro).';

-- ---------------------------------------------------------------------------
-- Timeline (imutável)
-- ---------------------------------------------------------------------------

create table negociacao_compra_evento (
  id uuid primary key default gen_random_uuid(),
  negociacao_id uuid not null references negociacao_compra(id) on delete cascade,
  autor_id uuid references usuario(id) on delete set null,
  tipo text not null check (tipo in (
    'iniciada',
    'proposta_enviada',
    'contraproposta_recebida',
    'aceita',
    'recusada',
    'cancelada',
    'observacao'
  )),
  valor numeric,
  observacao text,
  criado_em timestamptz not null default now()
);

create index negociacao_compra_evento_idx
  on negociacao_compra_evento(negociacao_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- RLS — segue o dono do cliente (padrão 0005)
-- ---------------------------------------------------------------------------

alter table decisao_imovel enable row level security;
alter table negociacao_compra enable row level security;
alter table negociacao_compra_evento enable row level security;

create policy "consultor_ve_decisoes_das_suas_oportunidades" on decisao_imovel
  for all
  using (exists (
    select 1 from oportunidade o
    join cliente c on c.id = o.cliente_id
    where o.id = decisao_imovel.oportunidade_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from oportunidade o
    join cliente c on c.id = o.cliente_id
    where o.id = decisao_imovel.oportunidade_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

create policy "consultor_ve_negociacoes_dos_seus_clientes" on negociacao_compra
  for all
  using (exists (
    select 1 from cliente c
    where c.id = negociacao_compra.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from cliente c
    where c.id = negociacao_compra.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

-- Timeline: só leitura e inserção (nenhuma policy de update/delete)
create policy "consultor_le_eventos_das_suas_negociacoes" on negociacao_compra_evento
  for select
  using (exists (
    select 1 from negociacao_compra n
    join cliente c on c.id = n.cliente_id
    where n.id = negociacao_compra_evento.negociacao_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

create policy "consultor_insere_eventos_das_suas_negociacoes" on negociacao_compra_evento
  for insert
  with check (exists (
    select 1 from negociacao_compra n
    join cliente c on c.id = n.cliente_id
    where n.id = negociacao_compra_evento.negociacao_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

-- ---------------------------------------------------------------------------
-- Históricos aceitam os novos eventos
-- ---------------------------------------------------------------------------

alter table oportunidade_historico
  drop constraint if exists oportunidade_historico_tipo_check;
alter table oportunidade_historico
  add constraint oportunidade_historico_tipo_check
  check (tipo in ('criacao', 'etapa', 'status', 'nota', 'visita', 'decisao', 'negociacao'));

alter table imovel_encontrado_historico
  drop constraint if exists imovel_encontrado_historico_tipo_check;
alter table imovel_encontrado_historico
  add constraint imovel_encontrado_historico_tipo_check
  check (tipo in (
    'parceiro',
    'negociacao',
    'status_negociacao',
    'curadoria',
    'observacao',
    'visita',
    'decisao',
    'compra'
  ));
