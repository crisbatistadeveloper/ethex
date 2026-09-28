-- Ethex — Fechamento da operação (último módulo do MVP)
-- Registro final: ganho/perdido, data, valor efetivamente fechado, motivo de
-- perda e comissão ETHEX (sem financeiro: nada de parcelas/recebíveis/NF).
-- Não sobrescreve negociacao_compra (preço/proposta/contraproposta/valor final)
-- nem due diligence. Status ganha/perdida da oportunidade passa a exigir fechamento.
-- Etapa "fechamento" já existe no pipeline (não cria estágio "Ganho").
-- Requer 0016. Aplicar só no ethex-dev.

create table fechamento (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null unique references oportunidade(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  consultor_id uuid not null references usuario(id),
  resultado text not null check (resultado in ('ganho', 'perdido')),
  data_fechamento date not null default current_date,
  -- Operação (obrigatório no ganho; contexto opcional na perda)
  negociacao_id uuid references negociacao_compra(id) on delete set null,
  imovel_id uuid references imovel(id) on delete set null,
  imovel_encontrado_id uuid references imovel_encontrado(id) on delete set null,
  due_diligence_id uuid references due_diligence_final(id) on delete set null,
  -- Valor efetivamente fechado (pode diferir do valor_final negociado)
  valor_fechado numeric check (valor_fechado is null or valor_fechado > 0),
  motivo_perda text check (motivo_perda in (
    'cliente_desistiu',
    'imovel_reprovado',
    'negociacao_nao_avancou',
    'preco',
    'documentacao',
    'parceiro',
    'escolheu_outro_imovel',
    'outro'
  )),
  observacoes text,
  -- Comissão ETHEX (registro comercial, não financeiro)
  comissao_tipo text check (comissao_tipo in ('percentual', 'valor')),
  comissao_percentual numeric check (comissao_percentual is null or (comissao_percentual > 0 and comissao_percentual <= 100)),
  comissao_prevista numeric check (comissao_prevista is null or comissao_prevista >= 0),
  comissao_efetiva numeric check (comissao_efetiva is null or comissao_efetiva >= 0),
  comissao_observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint fechamento_ganho_completo check (
    resultado <> 'ganho' or (
      negociacao_id is not null
      and imovel_id is not null
      and imovel_encontrado_id is not null
      and due_diligence_id is not null
      and valor_fechado is not null
      and motivo_perda is null
    )
  ),
  constraint fechamento_perdido_com_motivo check (
    resultado <> 'perdido' or (motivo_perda is not null and comissao_tipo is null
      and comissao_prevista is null and comissao_efetiva is null)
  )
);

create index fechamento_cliente_idx on fechamento(cliente_id);
create index fechamento_resultado_idx on fechamento(resultado, data_fechamento desc);

create trigger fechamento_set_atualizado_em
  before update on fechamento
  for each row execute function set_atualizado_em();

comment on table fechamento is
  'Registro final da operação (ganho/perdido). Não sobrescreve negociacao_compra nem due diligence.';

-- ---------------------------------------------------------------------------
-- Validação de coerência no INSERT (além da tela)
-- ---------------------------------------------------------------------------

create or replace function validar_fechamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op oportunidade%rowtype;
  v_neg negociacao_compra%rowtype;
  v_dd due_diligence_final%rowtype;
begin
  select * into v_op from oportunidade where id = new.oportunidade_id;
  if not found then
    raise exception 'Oportunidade não encontrada';
  end if;
  if v_op.status <> 'aberta' then
    raise exception 'Só oportunidades abertas podem ser fechadas';
  end if;
  if new.cliente_id <> v_op.cliente_id then
    raise exception 'Cliente não corresponde à oportunidade';
  end if;

  if new.negociacao_id is not null then
    select * into v_neg from negociacao_compra where id = new.negociacao_id;
    if not found or v_neg.oportunidade_id <> new.oportunidade_id then
      raise exception 'Negociação não pertence à oportunidade';
    end if;
  end if;

  if new.resultado = 'ganho' then
    if v_neg.status is distinct from 'aceita' then
      raise exception 'Ganho exige negociação de compra aceita';
    end if;
    if new.imovel_id <> v_neg.imovel_id or new.imovel_encontrado_id <> v_neg.imovel_encontrado_id then
      raise exception 'Imóvel não corresponde à negociação';
    end if;
    if not exists (
      select 1 from decisao_imovel d
      where d.oportunidade_id = new.oportunidade_id
        and d.imovel_encontrado_id = new.imovel_encontrado_id
        and d.decisao = 'escolhido'
    ) then
      raise exception 'Ganho exige o imóvel marcado como escolhido';
    end if;
    select * into v_dd from due_diligence_final where id = new.due_diligence_id;
    if not found or v_dd.negociacao_id <> new.negociacao_id then
      raise exception 'Due diligence não pertence à negociação';
    end if;
    if v_dd.status not in ('aprovada', 'aprovada_com_ressalvas') then
      raise exception 'Ganho exige due diligence final aprovada ou aprovada com ressalvas';
    end if;
  end if;

  return new;
end;
$$;

create trigger fechamento_validar
  before insert on fechamento
  for each row execute function validar_fechamento();

-- Registro final: depois de criado, só os campos de comissão e observações mudam.
create or replace function proteger_fechamento()
returns trigger
language plpgsql
as $$
begin
  if new.oportunidade_id is distinct from old.oportunidade_id
    or new.cliente_id is distinct from old.cliente_id
    or new.resultado is distinct from old.resultado
    or new.data_fechamento is distinct from old.data_fechamento
    or new.negociacao_id is distinct from old.negociacao_id
    or new.imovel_id is distinct from old.imovel_id
    or new.imovel_encontrado_id is distinct from old.imovel_encontrado_id
    or new.due_diligence_id is distinct from old.due_diligence_id
    or new.valor_fechado is distinct from old.valor_fechado
    or new.motivo_perda is distinct from old.motivo_perda
  then
    raise exception 'Fechamento registrado não pode ter resultado, data, valor ou motivo alterados';
  end if;
  return new;
end;
$$;

create trigger fechamento_proteger
  before update on fechamento
  for each row execute function proteger_fechamento();

-- ---------------------------------------------------------------------------
-- Status ganha/perdida da oportunidade exige fechamento correspondente
-- ---------------------------------------------------------------------------

create or replace function exigir_fechamento_para_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resultado text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  select resultado into v_resultado from fechamento where oportunidade_id = new.id;

  if new.status = 'ganha' and v_resultado is distinct from 'ganho' then
    raise exception 'Para marcar como ganha, registre o fechamento (ganho) da operação';
  end if;
  if new.status = 'perdida' and v_resultado is distinct from 'perdido' then
    raise exception 'Para marcar como perdida, registre o fechamento (perdido) com o motivo';
  end if;
  if old.status in ('ganha', 'perdida') and v_resultado is not null then
    raise exception 'Operação com fechamento registrado não pode ser reaberta';
  end if;
  return new;
end;
$$;

create trigger oportunidade_exigir_fechamento
  before update of status on oportunidade
  for each row execute function exigir_fechamento_para_status();

-- ---------------------------------------------------------------------------
-- Aplica o resultado na oportunidade na MESMA transação do fechamento
-- (ganho → status ganha + etapa fechamento + cliente fechado; perdido → perdida,
-- etapa preservada). Nada é apagado.
-- ---------------------------------------------------------------------------

create or replace function aplicar_fechamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.resultado = 'ganho' then
    update oportunidade set status = 'ganha', etapa = 'fechamento' where id = new.oportunidade_id;
    update cliente set status = 'fechado' where id = new.cliente_id;
  else
    update oportunidade set status = 'perdida' where id = new.oportunidade_id;
  end if;
  return new;
end;
$$;

create trigger fechamento_aplicar
  after insert on fechamento
  for each row execute function aplicar_fechamento();

-- ---------------------------------------------------------------------------
-- RLS — dono do cliente ou admin. Sem delete (registro final).
-- ---------------------------------------------------------------------------

alter table fechamento enable row level security;

create policy "fechamento_select" on fechamento
  for select to authenticated
  using (exists (
    select 1 from cliente c
    where c.id = fechamento.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

create policy "fechamento_insert" on fechamento
  for insert to authenticated
  with check (exists (
    select 1 from cliente c
    where c.id = fechamento.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

create policy "fechamento_update" on fechamento
  for update to authenticated
  using (exists (
    select 1 from cliente c
    where c.id = fechamento.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from cliente c
    where c.id = fechamento.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

-- ---------------------------------------------------------------------------
-- Históricos aceitam fechamento
-- ---------------------------------------------------------------------------

alter table oportunidade_historico
  drop constraint if exists oportunidade_historico_tipo_check;
alter table oportunidade_historico
  add constraint oportunidade_historico_tipo_check
  check (tipo in (
    'criacao', 'etapa', 'status', 'nota', 'visita', 'decisao', 'negociacao',
    'due_diligence', 'fechamento'
  ));

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
    'compra',
    'due_diligence',
    'fechamento'
  ));
