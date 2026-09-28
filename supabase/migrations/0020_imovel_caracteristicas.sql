-- Ethex — características estruturais do imóvel (catálogo compartilhado).
-- Ficam no imóvel, não em imovel_encontrado: descrevem o próprio imóvel.
-- quartos/vagas/m2 saem do JSON `caracteristicas` e viram colunas (sem duplicar).
-- Diferenciais: null = não informado, true = tem, false = não tem.

alter table imovel
  add column quartos int check (quartos >= 0),
  add column suites int check (suites >= 0),
  add column banheiros int check (banheiros >= 0),
  add column vagas int check (vagas >= 0),
  add column area_total numeric check (area_total > 0),
  add column varanda boolean,
  add column piscina boolean,
  add column churrasqueira boolean,
  add column quintal boolean,
  add column jardim boolean,
  add column lavabo boolean,
  add column escritorio boolean,
  add column closet boolean,
  add column elevador boolean,
  add column ar_condicionado boolean,
  add column mobiliado boolean,
  add column condominio_fechado boolean;

-- Backfill do JSON (só valores numéricos válidos)
update imovel set
  quartos = case
    when jsonb_typeof(caracteristicas->'quartos') = 'number'
      and (caracteristicas->>'quartos')::numeric >= 0
    then floor((caracteristicas->>'quartos')::numeric)::int end,
  vagas = case
    when jsonb_typeof(caracteristicas->'vagas') = 'number'
      and (caracteristicas->>'vagas')::numeric >= 0
    then floor((caracteristicas->>'vagas')::numeric)::int end,
  area_total = case
    when jsonb_typeof(caracteristicas->'m2') = 'number'
      and (caracteristicas->>'m2')::numeric > 0
    then (caracteristicas->>'m2')::numeric end
where caracteristicas ?| array['quartos', 'vagas', 'm2'];

update imovel
set caracteristicas = caracteristicas - 'quartos' - 'vagas' - 'm2'
where caracteristicas ?| array['quartos', 'vagas', 'm2'];

alter table imovel
  add constraint imovel_suites_ate_quartos
  check (suites is null or quartos is null or suites <= quartos);

-- Apresentação pública: mesma função da 0019, acrescentando as características.
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
        'status_construcao', i.status_construcao,
        'quartos', i.quartos,
        'suites', i.suites,
        'banheiros', i.banheiros,
        'vagas', i.vagas,
        'area_total', i.area_total,
        'varanda', i.varanda,
        'piscina', i.piscina,
        'churrasqueira', i.churrasqueira,
        'quintal', i.quintal,
        'jardim', i.jardim,
        'lavabo', i.lavabo,
        'escritorio', i.escritorio,
        'closet', i.closet,
        'elevador', i.elevador,
        'ar_condicionado', i.ar_condicionado,
        'mobiliado', i.mobiliado,
        'condominio_fechado', i.condominio_fechado,
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

revoke all on function public.apresentacao_publica(text) from public;
grant execute on function public.apresentacao_publica(text) to anon, authenticated;
