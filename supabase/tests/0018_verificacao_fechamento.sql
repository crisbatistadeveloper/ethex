-- Verificação da 0018 (rodar no SQL Editor do ethex-dev DEPOIS de aplicar a 0018).
-- Testa as travas de ganho/perda, imutabilidade e RLS. DESFAZ tudo ao final.
-- Se o SQL Editor avisar sobre tabela sem RLS: é tabela temporária → "Run without RLS".

drop table if exists _verificacao_0018;
create temp table _verificacao_0018 (ordem int, teste text, esperado text, obtido text, ok boolean);

do $$
declare
  v_op oportunidade%rowtype;
  v_ganho record;
  v_consultor uuid;
  v_intruso uuid := gen_random_uuid();
  v_status text;
  v_etapa text;
  v_n int;
  r text[] := '{}';
begin
  select * into v_op from oportunidade o
  where o.status = 'aberta'
    and not exists (select 1 from fechamento f where f.oportunidade_id = o.id)
  limit 1;
  if not found then
    raise exception 'Nenhuma oportunidade aberta sem fechamento para testar';
  end if;
  select consultor_id into v_consultor from cliente where id = v_op.cliente_id;

  -- Operação que cumpre as condições de ganho (se existir no dev)
  select n.oportunidade_id, n.id as negociacao_id, n.cliente_id, n.imovel_id, n.imovel_encontrado_id,
         d.id as dd_id, n.valor_final
  into v_ganho
  from negociacao_compra n
  join due_diligence_final d on d.negociacao_id = n.id
  join decisao_imovel di on di.oportunidade_id = n.oportunidade_id
    and di.imovel_encontrado_id = n.imovel_encontrado_id and di.decisao = 'escolhido'
  join oportunidade o on o.id = n.oportunidade_id and o.status = 'aberta'
  where n.status = 'aceita' and d.status in ('aprovada', 'aprovada_com_ressalvas')
    and not exists (select 1 from fechamento f where f.oportunidade_id = n.oportunidade_id)
  limit 1;

  begin
    -- 1. Marcar ganha/perdida direto (sem fechamento) é bloqueado
    begin
      update oportunidade set status = 'ganha' where id = v_op.id;
      r := r || '1|Status ganha sem fechamento|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '1|Status ganha sem fechamento|bloqueado|bloqueado'::text;
    end;
    begin
      update oportunidade set status = 'perdida' where id = v_op.id;
      r := r || '1|Status perdida sem fechamento|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '1|Status perdida sem fechamento|bloqueado|bloqueado'::text;
    end;

    -- 2. Ganho sem as condições é bloqueado
    begin
      insert into fechamento (oportunidade_id, cliente_id, consultor_id, resultado, valor_fechado)
      values (v_op.id, v_op.cliente_id, v_consultor, 'ganho', 100000);
      r := r || '2|Ganho sem negociação/due diligence|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '2|Ganho sem negociação/due diligence|bloqueado|bloqueado'::text;
    end;

    -- 3. Perda sem motivo é bloqueada
    begin
      insert into fechamento (oportunidade_id, cliente_id, consultor_id, resultado)
      values (v_op.id, v_op.cliente_id, v_consultor, 'perdido');
      r := r || '3|Perda sem motivo|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '3|Perda sem motivo|bloqueado|bloqueado'::text;
    end;

    -- 4. Perda com motivo → oportunidade perdida, etapa preservada
    insert into fechamento (oportunidade_id, cliente_id, consultor_id, resultado, motivo_perda, observacoes)
    values (v_op.id, v_op.cliente_id, v_consultor, 'perdido', 'cliente_desistiu', 'teste 0018');
    select status::text, etapa::text into v_status, v_etapa from oportunidade where id = v_op.id;
    r := r || format('4|Perda com motivo: oportunidade vira perdida|perdida|%s', v_status);
    r := r || format('4|Perda: etapa preservada|%s|%s', v_op.etapa, v_etapa);

    -- 5. Registro final: não reabre, não muda motivo, não aceita segundo fechamento
    begin
      update oportunidade set status = 'aberta' where id = v_op.id;
      r := r || '5|Reabrir operação com fechamento|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '5|Reabrir operação com fechamento|bloqueado|bloqueado'::text;
    end;
    begin
      update fechamento set motivo_perda = 'preco' where oportunidade_id = v_op.id;
      r := r || '5|Alterar motivo depois de registrado|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '5|Alterar motivo depois de registrado|bloqueado|bloqueado'::text;
    end;
    begin
      insert into fechamento (oportunidade_id, cliente_id, consultor_id, resultado, motivo_perda)
      values (v_op.id, v_op.cliente_id, v_consultor, 'perdido', 'outro');
      r := r || '5|Segundo fechamento na mesma oportunidade|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '5|Segundo fechamento na mesma oportunidade|bloqueado|bloqueado'::text;
    end;

    -- 6. RLS
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_consultor, 'role', 'authenticated')::text, true);
    select count(*) into v_n from fechamento where oportunidade_id = v_op.id;
    r := r || format('6|Consultor dono vê o fechamento|1|%s', v_n);
    perform set_config('request.jwt.claims', json_build_object('sub', v_intruso, 'role', 'authenticated')::text, true);
    select count(*) into v_n from fechamento where oportunidade_id = v_op.id;
    r := r || format('6|Não autorizado não vê o fechamento|0|%s', v_n);
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    begin
      select count(*) into v_n from fechamento;
    exception when others then
      v_n := 0;
    end;
    r := r || format('6|Anônimo não vê fechamentos|0|%s', v_n);
    execute 'reset role';

    -- 7. Ganho completo (só se houver operação apta no dev)
    if v_ganho.oportunidade_id is null then
      r := r || '7|Ganho com condições cumpridas|ganha|sem operação apta no dev'::text;
    else
      insert into fechamento (oportunidade_id, cliente_id, consultor_id, resultado, negociacao_id, imovel_id,
                              imovel_encontrado_id, due_diligence_id, valor_fechado)
      select v_ganho.oportunidade_id, v_ganho.cliente_id, c.consultor_id, 'ganho', v_ganho.negociacao_id,
             v_ganho.imovel_id, v_ganho.imovel_encontrado_id, v_ganho.dd_id, coalesce(v_ganho.valor_final, 1)
      from cliente c where c.id = v_ganho.cliente_id;
      select status::text, etapa::text into v_status, v_etapa from oportunidade where id = v_ganho.oportunidade_id;
      r := r || format('7|Ganho com condições cumpridas|ganha|%s', v_status);
      r := r || format('7|Ganho: etapa Fechamento|fechamento|%s', v_etapa);
    end if;

    raise exception 'ROLLBACK_0018';
  exception when others then
    if sqlerrm <> 'ROLLBACK_0018' then
      r := r || format('9|ERRO durante o teste|—|%s', sqlerrm);
    end if;
  end;

  insert into _verificacao_0018 (ordem, teste, esperado, obtido, ok)
  select split_part(x, '|', 1)::int, split_part(x, '|', 2), split_part(x, '|', 3), split_part(x, '|', 4),
         split_part(x, '|', 3) = split_part(x, '|', 4)
  from unnest(r) as x;
end $$;

select ordem, teste, esperado, obtido, ok from _verificacao_0018 order by ordem, teste;
