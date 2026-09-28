-- Ethex — Visita acompanhada com o cliente
-- Diferente da visita_previa (consultor sozinho, pertence ao imóvel):
-- visita_cliente pertence à jornada do cliente/oportunidade.
-- "Quero visitar" na apresentação pública cria uma solicitação (sem agendar).
-- NÃO altera etapa da oportunidade automaticamente.
-- Requer 0013. Aplicar só no ethex-dev.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type visita_cliente_status as enum (
  'solicitada',
  'agendada',
  'realizada',
  'cancelada',
  'nao_compareceu'
);

create type visita_cliente_resultado as enum (
  'gostou',
  'gostou_com_ressalvas',
  'nao_gostou',
  'quer_negociar',
  'quer_pensar',
  'descartado'
);

create type visita_cliente_origem as enum (
  'apresentacao',
  'consultor'
);

-- ---------------------------------------------------------------------------
-- Visita com cliente
-- ---------------------------------------------------------------------------

create table visita_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references cliente(id) on delete cascade,
  oportunidade_id uuid references oportunidade(id) on delete set null,
  imovel_id uuid not null references imovel(id) on delete cascade,
  imovel_encontrado_id uuid not null references imovel_encontrado(id) on delete cascade,
  consultor_id uuid not null references usuario(id),
  apresentacao_item_id uuid references apresentacao_item(id) on delete set null,
  atividade_id uuid references atividade(id) on delete set null,
  origem visita_cliente_origem not null default 'consultor',
  status visita_cliente_status not null default 'solicitada',
  solicitada_em timestamptz not null default now(),
  data_visita date,
  horario time,
  observacoes text,
  -- Resultado (após realizada)
  resultado visita_cliente_resultado,
  pontos_positivos text,
  pontos_negativos text,
  observacoes_resultado text,
  proximos_passos text,
  realizada_em timestamptz,
  cancelada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index visita_cliente_cliente_idx on visita_cliente(cliente_id);
create index visita_cliente_oportunidade_idx on visita_cliente(oportunidade_id);
create index visita_cliente_ie_idx on visita_cliente(imovel_encontrado_id);
create index visita_cliente_status_data_idx on visita_cliente(status, data_visita, horario);

-- Uma solicitação/visita aberta por imóvel da curadoria (evita duplicar cliques)
create unique index visita_cliente_uma_aberta_por_imovel
  on visita_cliente(imovel_encontrado_id)
  where status in ('solicitada', 'agendada');

create trigger visita_cliente_set_atualizado_em
  before update on visita_cliente
  for each row execute function set_atualizado_em();

comment on table visita_cliente is
  'Visita do cliente acompanhada pelo consultor. Não confundir com visita_previa (consultor sozinho).';

-- ---------------------------------------------------------------------------
-- RLS — segue o dono do cliente (padrão 0005)
-- ---------------------------------------------------------------------------

alter table visita_cliente enable row level security;

create policy "consultor_ve_visitas_dos_seus_clientes" on visita_cliente
  for all
  using (exists (
    select 1 from cliente c
    where c.id = visita_cliente.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from cliente c
    where c.id = visita_cliente.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

-- ---------------------------------------------------------------------------
-- Históricos aceitam eventos de visita
-- ---------------------------------------------------------------------------

alter table oportunidade_historico
  drop constraint if exists oportunidade_historico_tipo_check;
alter table oportunidade_historico
  add constraint oportunidade_historico_tipo_check
  check (tipo in ('criacao', 'etapa', 'status', 'nota', 'visita'));

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
    'visita'
  ));

-- ---------------------------------------------------------------------------
-- Resposta pública: "Quero visitar" cria solicitação (substitui versão da 0013)
-- ---------------------------------------------------------------------------

create or replace function public.apresentacao_responder(
  p_token text,
  p_item_id uuid,
  p_resposta text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  a apresentacao;
  v_ie uuid;
  v_imovel uuid;
  v_titulo text;
  v_consultor uuid;
  v_op uuid;
  v_label text;
  v_visita uuid;
begin
  if p_resposta not in ('interessado', 'nao_interessado', 'selecionado_visita') then
    return false;
  end if;

  select * into a from apresentacao
  where token = p_token and status in ('enviada', 'em_avaliacao');
  if not found then
    return false;
  end if;

  update apresentacao_item
  set status = p_resposta::apresentacao_item_status,
      resposta_cliente = p_resposta::apresentacao_item_status,
      resposta_cliente_em = now()
  where id = p_item_id and apresentacao_id = a.id
  returning imovel_encontrado_id into v_ie;

  if v_ie is null then
    return false;
  end if;

  if a.status = 'enviada' then
    update apresentacao set status = 'em_avaliacao' where id = a.id;
  end if;

  v_label := case p_resposta
    when 'interessado' then 'Tenho interesse'
    when 'nao_interessado' then 'Não tenho interesse'
    else 'Quero visitar'
  end;

  insert into imovel_encontrado_historico (imovel_encontrado_id, autor_id, tipo, detalhe)
  values (v_ie, null, 'observacao', 'Cliente respondeu na apresentação: ' || v_label);

  select ie.imovel_id, coalesce(i.caracteristicas->>'titulo', 'imóvel')
    into v_imovel, v_titulo
  from imovel_encontrado ie
  join imovel i on i.id = ie.imovel_id
  where ie.id = v_ie;

  select consultor_id into v_consultor from cliente where id = a.cliente_id;

  select id into v_op from oportunidade
  where cliente_id = a.cliente_id
  order by (status = 'aberta') desc, criado_em desc
  limit 1;

  if p_resposta = 'selecionado_visita' then
    insert into visita_cliente (
      cliente_id, oportunidade_id, imovel_id, imovel_encontrado_id,
      consultor_id, apresentacao_item_id, origem, status
    )
    values (
      a.cliente_id, v_op, v_imovel, v_ie,
      v_consultor, p_item_id, 'apresentacao', 'solicitada'
    )
    on conflict (imovel_encontrado_id) where status in ('solicitada', 'agendada')
    do nothing
    returning id into v_visita;

    if v_visita is not null then
      insert into imovel_encontrado_historico (imovel_encontrado_id, autor_id, tipo, detalhe)
      values (v_ie, null, 'visita', 'Cliente solicitou visita ao imóvel.');
      if v_op is not null then
        insert into oportunidade_historico (oportunidade_id, autor_id, tipo, detalhe)
        values (v_op, null, 'visita', 'Cliente solicitou visita ao imóvel: ' || v_titulo || '.');
      end if;
    end if;
  else
    -- Cliente mudou de ideia: retira só solicitação ainda não agendada.
    update visita_cliente
    set status = 'cancelada',
        cancelada_em = now(),
        observacoes = coalesce(observacoes || E'\n', '') ||
          'Cliente retirou a solicitação pela apresentação.'
    where imovel_encontrado_id = v_ie
      and status = 'solicitada'
      and origem = 'apresentacao'
    returning id into v_visita;

    if v_visita is not null then
      insert into imovel_encontrado_historico (imovel_encontrado_id, autor_id, tipo, detalhe)
      values (v_ie, null, 'visita', 'Cliente retirou a solicitação de visita.');
      if v_op is not null then
        insert into oportunidade_historico (oportunidade_id, autor_id, tipo, detalhe)
        values (v_op, null, 'visita', 'Cliente retirou a solicitação de visita: ' || v_titulo || '.');
      end if;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.apresentacao_responder(text, uuid, text) from public;
grant execute on function public.apresentacao_responder(text, uuid, text) to anon, authenticated;
