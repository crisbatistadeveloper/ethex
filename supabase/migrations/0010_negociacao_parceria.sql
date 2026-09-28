-- Ethex — Negociação de parceria por imóvel encontrado (curadoria)
-- Política geral do parceiro ≠ negociacao_parceria (específica do imóvel).
-- Aplicar só no ethex-dev.

-- ---------------------------------------------------------------------------
-- Negociação específica deste ImovelEncontrado
-- ---------------------------------------------------------------------------

create type negociacao_parceria_status as enum (
  'pendente',
  'em_negociacao',
  'aprovado',
  'recusado'
);

create table negociacao_parceria (
  id uuid primary key default gen_random_uuid(),
  imovel_encontrado_id uuid not null unique
    references imovel_encontrado(id) on delete cascade,
  parceiro_id uuid not null references parceiro(id),
  comissao_solicitada text,
  comissao_negociada text,
  modelo_divisao text,
  status negociacao_parceria_status not null default 'pendente',
  observacoes text,
  negociado_em timestamptz,
  responsavel_id uuid references usuario(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index negociacao_parceria_parceiro_id_idx
  on negociacao_parceria(parceiro_id);

create trigger negociacao_parceria_set_atualizado_em
  before update on negociacao_parceria
  for each row execute function set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Histórico da curadoria (ImovelEncontrado)
-- ---------------------------------------------------------------------------

create table imovel_encontrado_historico (
  id uuid primary key default gen_random_uuid(),
  imovel_encontrado_id uuid not null
    references imovel_encontrado(id) on delete cascade,
  autor_id uuid references usuario(id) on delete set null,
  tipo text not null check (tipo in (
    'parceiro',
    'negociacao',
    'status_negociacao',
    'curadoria',
    'observacao'
  )),
  detalhe text not null,
  criado_em timestamptz not null default now()
);

create index imovel_encontrado_historico_ie_idx
  on imovel_encontrado_historico(imovel_encontrado_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- RLS — segue o dono do cliente da curadoria (padrão 0005)
-- ---------------------------------------------------------------------------

alter table negociacao_parceria enable row level security;
alter table imovel_encontrado_historico enable row level security;

create policy "consultor_ve_negociacao_das_suas_curadorias" on negociacao_parceria
  for all
  using (exists (
    select 1
    from imovel_encontrado ie
    join busca b on b.id = ie.busca_id
    join perfil p on p.id = b.perfil_id
    join cliente c on c.id = p.cliente_id
    where ie.id = negociacao_parceria.imovel_encontrado_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1
    from imovel_encontrado ie
    join busca b on b.id = ie.busca_id
    join perfil p on p.id = b.perfil_id
    join cliente c on c.id = p.cliente_id
    where ie.id = negociacao_parceria.imovel_encontrado_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

create policy "consultor_ve_historico_das_suas_curadorias" on imovel_encontrado_historico
  for all
  using (exists (
    select 1
    from imovel_encontrado ie
    join busca b on b.id = ie.busca_id
    join perfil p on p.id = b.perfil_id
    join cliente c on c.id = p.cliente_id
    where ie.id = imovel_encontrado_historico.imovel_encontrado_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1
    from imovel_encontrado ie
    join busca b on b.id = ie.busca_id
    join perfil p on p.id = b.perfil_id
    join cliente c on c.id = p.cliente_id
    where ie.id = imovel_encontrado_historico.imovel_encontrado_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));
