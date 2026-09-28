-- Ethex — Apresentação de imóveis ao cliente
-- Apresentação pertence à Busca/Cliente; itens apontam para ImovelEncontrado.
-- Conteúdo do imóvel NÃO é duplicado: é lido de imovel / visita_previa / visita_previa_midia.
-- Link público por token, lido via funções security definer (sem abrir RLS para anon).
-- NÃO altera etapa da oportunidade.
-- Requer 0011 (due_diligence) e 0012 (visita_previa). Aplicar só no ethex-dev.

-- ---------------------------------------------------------------------------
-- Seleção na curadoria (específica da busca/cliente, não do catálogo)
-- ---------------------------------------------------------------------------

alter table imovel_encontrado
  add column if not exists selecionado_apresentacao boolean not null default false;

-- ---------------------------------------------------------------------------
-- Apresentação
-- ---------------------------------------------------------------------------

create type apresentacao_status as enum (
  'rascunho',
  'enviada',
  'em_avaliacao',
  'concluida'
);

create type apresentacao_item_status as enum (
  'apresentado',
  'interessado',
  'nao_interessado',
  'selecionado_visita'
);

create table apresentacao (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references cliente(id) on delete cascade,
  busca_id uuid not null references busca(id) on delete cascade,
  consultor_id uuid not null references usuario(id),
  status apresentacao_status not null default 'rascunho',
  observacoes text,
  -- 64 hex (2 × uuid v4 aleatório) — não adivinhável
  token text not null unique default (
    replace(gen_random_uuid()::text, '-', '') ||
    replace(gen_random_uuid()::text, '-', '')
  ),
  enviada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index apresentacao_cliente_id_idx on apresentacao(cliente_id, criado_em desc);
create index apresentacao_busca_id_idx on apresentacao(busca_id);

create trigger apresentacao_set_atualizado_em
  before update on apresentacao
  for each row execute function set_atualizado_em();

create table apresentacao_item (
  id uuid primary key default gen_random_uuid(),
  apresentacao_id uuid not null references apresentacao(id) on delete cascade,
  imovel_encontrado_id uuid not null references imovel_encontrado(id) on delete cascade,
  ordem int not null default 0,
  observacao_consultor text,
  destaque boolean not null default false,
  status apresentacao_item_status not null default 'apresentado',
  -- Última resposta dada pelo próprio cliente no link público
  resposta_cliente apresentacao_item_status,
  resposta_cliente_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (apresentacao_id, imovel_encontrado_id)
);

create index apresentacao_item_ordem_idx on apresentacao_item(apresentacao_id, ordem);

create trigger apresentacao_item_set_atualizado_em
  before update on apresentacao_item
  for each row execute function set_atualizado_em();

comment on table apresentacao is
  'Seleção de imóveis da curadoria apresentada ao cliente. Específica da busca/cliente.';
comment on column apresentacao_item.resposta_cliente is
  'Resposta registrada pelo cliente via link público (interessado / nao_interessado / selecionado_visita).';

-- ---------------------------------------------------------------------------
-- RLS — segue o dono do cliente (padrão 0005)
-- ---------------------------------------------------------------------------

alter table apresentacao enable row level security;
alter table apresentacao_item enable row level security;

create policy "consultor_ve_apresentacoes_dos_seus_clientes" on apresentacao
  for all
  using (exists (
    select 1 from cliente c
    where c.id = apresentacao.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from cliente c
    where c.id = apresentacao.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

create policy "consultor_ve_itens_das_suas_apresentacoes" on apresentacao_item
  for all
  using (exists (
    select 1 from apresentacao a
    join cliente c on c.id = a.cliente_id
    where a.id = apresentacao_item.apresentacao_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from apresentacao a
    join cliente c on c.id = a.cliente_id
    where a.id = apresentacao_item.apresentacao_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

-- ---------------------------------------------------------------------------
-- Acesso público por token (anon) — somente leitura do necessário + resposta
-- Não expõe: URL/fonte do anúncio, contato do anúncio, parceiro, comissão.
-- Rascunho nunca é público.
-- ---------------------------------------------------------------------------

create or replace function public.apresentacao_publica(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a apresentacao;
  v_cliente text;
  v_consultor text;
  v_itens jsonb;
begin
  if p_token is null or length(p_token) < 32 then
    return null;
  end if;

  select * into a from apresentacao
  where token = p_token and status <> 'rascunho';
  if not found then
    return null;
  end if;

  select split_part(nome, ' ', 1) into v_cliente from cliente where id = a.cliente_id;
  select nome into v_consultor from usuario where id = a.consultor_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', ai.id,
      'ordem', ai.ordem,
      'destaque', ai.destaque,
      'status', ai.status,
      'resposta_cliente', ai.resposta_cliente,
      'observacao_consultor', ai.observacao_consultor,
      'curadoria_id', ie.id,
      'due_diligence_status', ie.due_diligence_status,
      'imovel', jsonb_build_object(
        'id', i.id,
        'preco', i.preco,
        'caracteristicas', i.caracteristicas,
        'endereco_texto', i.endereco_texto,
        'latitude', i.latitude,
        'longitude', i.longitude,
        'midia_propria', i.midia_propria
      ),
      'visita', (
        select jsonb_build_object(
          'recomendacao', v.recomendacao,
          'data_visita', v.data_visita,
          'avaliacao_geral', v.avaliacao_geral,
          'pontos_positivos', v.pontos_positivos,
          'pontos_negativos', v.pontos_negativos,
          'midias', coalesce((
            select jsonb_agg(
              jsonb_build_object('tipo', m.tipo, 'url', m.url, 'descricao', m.descricao)
              order by m.ordem
            )
            from visita_previa_midia m
            where m.visita_id = v.id
          ), '[]'::jsonb)
        )
        from visita_previa v
        where v.imovel_id = i.id and v.status = 'realizada'
        order by v.data_visita desc nulls last
        limit 1
      )
    )
    order by ai.ordem
  ), '[]'::jsonb)
  into v_itens
  from apresentacao_item ai
  join imovel_encontrado ie on ie.id = ai.imovel_encontrado_id
  join imovel i on i.id = ie.imovel_id
  where ai.apresentacao_id = a.id;

  return jsonb_build_object(
    'apresentacao', jsonb_build_object(
      'id', a.id,
      'status', a.status,
      'observacoes', a.observacoes,
      'criado_em', a.criado_em,
      'cliente_nome', v_cliente,
      'consultor_nome', v_consultor
    ),
    'itens', v_itens
  );
end;
$$;

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
  v_label text;
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

  return true;
end;
$$;

revoke all on function public.apresentacao_publica(text) from public;
revoke all on function public.apresentacao_responder(text, uuid, text) from public;
grant execute on function public.apresentacao_publica(text) to anon, authenticated;
grant execute on function public.apresentacao_responder(text, uuid, text) to anon, authenticated;
