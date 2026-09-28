-- Ethex — estágio de construção do imóvel (característica do catálogo compartilhado).
-- Não se confunde com tipo do imóvel, status da oportunidade nem status da curadoria.
-- Imóveis já cadastrados ficam sem valor ("não informado") até o consultor definir.

create type imovel_status_construcao as enum ('pronto', 'em_construcao', 'na_planta');

alter table imovel add column status_construcao imovel_status_construcao;

create index imovel_status_construcao_idx on imovel(status_construcao);

-- Apresentação pública: mesma função da 0013, acrescentando só imovel.status_construcao.
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
