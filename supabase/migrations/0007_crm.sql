-- Ethex — CRM comercial V1 (camada sobre Cliente/Perfil/Busca existentes)
-- NÃO duplica cliente, perfil, busca, imovel ou imovel_encontrado.
-- Relação: Cliente → Oportunidade → (via cliente) Perfil → Busca → Imóveis
-- Stubs: parceiro e imovel_documento (módulos futuros, sem UI completa).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type oportunidade_etapa as enum (
  'novo_lead',
  'entrevista',
  'busca',
  'curadoria',
  'visita',
  'negociacao',
  'fechamento'
);

create type oportunidade_status as enum (
  'aberta',
  'ganha',
  'perdida'
);

create type atividade_tipo as enum (
  'ligacao',
  'whatsapp',
  'reuniao',
  'entrevista',
  'visita',
  'tarefa',
  'observacao'
);

create type atividade_status as enum (
  'pendente',
  'concluida'
);

-- ---------------------------------------------------------------------------
-- Oportunidade
-- ---------------------------------------------------------------------------

create table oportunidade (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references cliente(id) on delete cascade,
  consultor_id uuid not null references usuario(id),
  lead_id uuid references lead(id) on delete set null,
  titulo text not null,
  etapa oportunidade_etapa not null default 'novo_lead',
  status oportunidade_status not null default 'aberta',
  valor_estimado numeric,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index oportunidade_cliente_id_idx on oportunidade(cliente_id);
create index oportunidade_consultor_id_idx on oportunidade(consultor_id);
create index oportunidade_etapa_status_idx on oportunidade(status, etapa);

create trigger oportunidade_set_atualizado_em
  before update on oportunidade
  for each row execute function set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Atividade
-- ---------------------------------------------------------------------------

create table atividade (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references oportunidade(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  responsavel_id uuid not null references usuario(id),
  tipo atividade_tipo not null default 'tarefa',
  titulo text not null,
  descricao text,
  data_hora timestamptz not null default now(),
  status atividade_status not null default 'pendente',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index atividade_oportunidade_id_idx on atividade(oportunidade_id);
create index atividade_cliente_id_idx on atividade(cliente_id);
create index atividade_pendente_idx on atividade(status, data_hora);

create trigger atividade_set_atualizado_em
  before update on atividade
  for each row execute function set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Histórico
-- ---------------------------------------------------------------------------

create table oportunidade_historico (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references oportunidade(id) on delete cascade,
  autor_id uuid references usuario(id) on delete set null,
  tipo text not null check (tipo in ('criacao', 'etapa', 'status', 'nota')),
  etapa_anterior oportunidade_etapa,
  etapa_nova oportunidade_etapa,
  status_anterior oportunidade_status,
  status_novo oportunidade_status,
  detalhe text,
  criado_em timestamptz not null default now()
);

create index oportunidade_historico_op_idx
  on oportunidade_historico(oportunidade_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- Stub: parceiros (UI em etapa futura)
-- ---------------------------------------------------------------------------

create table parceiro (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('corretor', 'imobiliaria')),
  nome text not null,
  creci text,
  contato_nome text,
  contato_telefone text,
  contato_email text,
  politica_comissao text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger parceiro_set_atualizado_em
  before update on parceiro
  for each row execute function set_atualizado_em();

alter table imovel_encontrado
  add column parceiro_id uuid references parceiro(id) on delete set null;

create index imovel_encontrado_parceiro_id_idx on imovel_encontrado(parceiro_id);

-- ---------------------------------------------------------------------------
-- Stub: documentação / due diligence do imóvel
-- ---------------------------------------------------------------------------

create table imovel_documento (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imovel(id) on delete cascade,
  tipo text not null default 'outro',
  titulo text not null,
  url text,
  status text not null default 'pendente'
    check (status in ('pendente', 'em_analise', 'aprovado', 'rejeitado')),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index imovel_documento_imovel_id_idx on imovel_documento(imovel_id);

create trigger imovel_documento_set_atualizado_em
  before update on imovel_documento
  for each row execute function set_atualizado_em();

-- ---------------------------------------------------------------------------
-- RLS (padrão admin/consultor da 0005)
-- ---------------------------------------------------------------------------

alter table oportunidade enable row level security;
alter table atividade enable row level security;
alter table oportunidade_historico enable row level security;
alter table parceiro enable row level security;
alter table imovel_documento enable row level security;

create policy "consultor_ve_suas_oportunidades" on oportunidade
  for all
  using (consultor_id = auth.uid() or is_admin())
  with check (consultor_id = auth.uid() or is_admin());

create policy "consultor_ve_atividades_das_suas_oportunidades" on atividade
  for all
  using (exists (
    select 1 from oportunidade o
    where o.id = atividade.oportunidade_id
      and (o.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from oportunidade o
    where o.id = atividade.oportunidade_id
      and (o.consultor_id = auth.uid() or is_admin())
  ));

create policy "consultor_ve_historico_das_suas_oportunidades" on oportunidade_historico
  for all
  using (exists (
    select 1 from oportunidade o
    where o.id = oportunidade_historico.oportunidade_id
      and (o.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from oportunidade o
    where o.id = oportunidade_historico.oportunidade_id
      and (o.consultor_id = auth.uid() or is_admin())
  ));

create policy "authenticated_all_parceiro" on parceiro
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "authenticated_all_imovel_documento" on imovel_documento
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Backfill: 1 oportunidade por cliente existente
-- ---------------------------------------------------------------------------

insert into oportunidade (cliente_id, consultor_id, titulo, etapa, status, valor_estimado)
select
  c.id,
  c.consultor_id,
  'Oportunidade — ' || c.nome,
  case c.status
    when 'em_entrevista' then 'entrevista'::oportunidade_etapa
    when 'em_busca' then 'busca'::oportunidade_etapa
    when 'em_curadoria' then 'curadoria'::oportunidade_etapa
    when 'fechado' then 'fechamento'::oportunidade_etapa
    else 'novo_lead'::oportunidade_etapa
  end,
  case when c.status = 'fechado' then 'ganha'::oportunidade_status
       else 'aberta'::oportunidade_status
  end,
  p.orcamento_max
from cliente c
left join perfil p on p.cliente_id = c.id
where not exists (
  select 1 from oportunidade o where o.cliente_id = c.id
);

insert into oportunidade_historico (oportunidade_id, autor_id, tipo, etapa_nova, status_novo, detalhe)
select
  o.id,
  o.consultor_id,
  'criacao',
  o.etapa,
  o.status,
  'Oportunidade criada no backfill do CRM'
from oportunidade o
where not exists (
  select 1 from oportunidade_historico h
  where h.oportunidade_id = o.id and h.tipo = 'criacao'
);
