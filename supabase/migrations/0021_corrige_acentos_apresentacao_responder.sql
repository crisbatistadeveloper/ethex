-- 0021 — Corrige acentuação da função apresentacao_responder e do histórico
--
-- A versão de apresentacao_responder aplicada no ethex-dev (0014) ficou com
-- textos em encoding quebrado (ex.: "imÃ³vel"). Esta migration:
--   1. recria a função com o mesmo corpo da 0014, em UTF-8;
--   2. corrige os registros de histórico já gravados com esses textos.
-- Não altera estrutura, RLS nem regras. Aplicar só no ethex-dev.

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

-- ---------------------------------------------------------------------------
-- Corrige textos já gravados (sequências UTF-8 lidas como Latin-1/Windows-1252)
-- ---------------------------------------------------------------------------

create or replace function pg_temp.corrige_acentos(t text)
returns text
language sql
immutable
as $$
  select
    replace(replace(replace(replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(replace(replace(replace(
    replace(replace(replace(t,
      'Ã³', 'ó'), 'Ã§', 'ç'), 'Ã£', 'ã'), 'Ã©', 'é'), 'Ã¡', 'á'),
      'Ãª', 'ê'), 'Ãµ', 'õ'), 'Ãº', 'ú'), 'Ã¢', 'â'), 'Ã´', 'ô'),
      'Ã' || chr(173), 'í'), 'Ã' || chr(160), 'à'), 'Ã‡', 'Ç'), 'Ã‰', 'É'),
      'Ã“', 'Ó'), 'â€”', '—'), 'â€“', '–'), 'Â·', '·'), 'Ã¼', 'ü')
$$;

update oportunidade_historico
set detalhe = pg_temp.corrige_acentos(detalhe)
where detalhe ~ '(Ã|â€|Â)';

update imovel_encontrado_historico
set detalhe = pg_temp.corrige_acentos(detalhe)
where detalhe ~ '(Ã|â€|Â)';

update visita_cliente
set observacoes = pg_temp.corrige_acentos(observacoes)
where observacoes ~ '(Ã|â€|Â)';
