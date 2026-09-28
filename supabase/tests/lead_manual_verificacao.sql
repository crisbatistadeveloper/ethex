-- Verificação do cadastro manual de lead (sem migration; roda no SQL Editor do ethex-dev).
-- Simula consultor, admin, outro usuário e anônimo com a RLS atual. DESFAZ tudo ao final.
-- Se o SQL Editor avisar sobre tabela sem RLS: é tabela temporária → "Run without RLS".

drop table if exists _verificacao_lead;
create temp table _verificacao_lead (ordem int, teste text, esperado text, obtido text, ok boolean);

do $$
declare
  v_consultor uuid;
  v_admin uuid;
  v_intruso uuid := gen_random_uuid();
  v_lead uuid;
  v_cliente uuid;
  v_op uuid;
  v_email text := 'teste-' || gen_random_uuid() || '@ethex.dev';
  v_n int;
  r text[] := '{}';
begin
  select id into v_consultor from usuario where papel = 'consultor' and ativo order by criado_em limit 1;
  select id into v_admin from usuario where papel = 'admin' order by criado_em limit 1;
  if v_consultor is null or v_admin is null then
    raise exception 'Precisa de ao menos 1 consultor e 1 admin em usuario';
  end if;

  begin
    perform set_config('role', 'authenticated', true);

    -- CONSULTOR ------------------------------------------------------------
    perform set_config('request.jwt.claims', json_build_object('sub', v_consultor, 'role', 'authenticated')::text, true);

    insert into lead (nome, telefone, email, origem, consultor_id, status)
    values ('Lead Manual Teste', '11999990000', v_email, 'whatsapp', v_consultor, 'atribuido')
    returning id into v_lead;
    r := r || '1|Consultor cria lead para si|ok|ok'::text;

    select count(*) into v_n from lead where id = v_lead;
    r := r || format('2|Lead aparece para o consultor|1|%s', v_n);

    begin
      insert into lead (nome, telefone, origem, consultor_id, status)
      values ('Outro', '1', 'telefone', v_admin, 'atribuido');
      r := r || '3|Consultor atribui lead a outro usuário|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '3|Consultor atribui lead a outro usuário|bloqueado|bloqueado'::text;
    end;

    begin
      insert into lead (nome, telefone, origem, status) values ('Sem dono', '1', 'telefone', 'novo');
      r := r || '3|Consultor cria lead sem responsável|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '3|Consultor cria lead sem responsável|bloqueado|bloqueado'::text;
    end;

    begin
      insert into lead (nome, email, origem, consultor_id, status)
      values ('Duplicado', upper(v_email), 'outro', v_consultor, 'atribuido');
      r := r || '4|E-mail duplicado (regra existente)|bloqueado|PERMITIDO'::text;
    exception when unique_violation then
      r := r || '4|E-mail duplicado (regra existente)|bloqueado|bloqueado'::text;
    end;

    -- Conversão: mesmos passos de convertLead
    insert into cliente (nome, email, telefone, origem_lead, consultor_id)
    values ('Lead Manual Teste', v_email, '11999990000', 'WhatsApp', v_consultor)
    returning id into v_cliente;
    r := r || '5|Conversão cria cliente|ok|ok'::text;

    update lead set status = 'convertido', cliente_id = v_cliente where id = v_lead;
    get diagnostics v_n = row_count;
    r := r || format('5|Conversão marca lead como convertido|1|%s', v_n);

    insert into oportunidade (cliente_id, consultor_id, lead_id, titulo, etapa, status)
    values (v_cliente, v_consultor, v_lead, 'Oportunidade — Lead Manual Teste', 'novo_lead', 'aberta')
    returning id into v_op;
    insert into oportunidade_historico (oportunidade_id, autor_id, tipo, etapa_nova, status_novo, detalhe)
    values (v_op, v_consultor, 'criacao', 'novo_lead', 'aberta', 'Oportunidade criada automaticamente');
    r := r || '6|Conversão cria oportunidade + histórico|ok|ok'::text;

    -- OUTRO USUÁRIO --------------------------------------------------------
    perform set_config('request.jwt.claims', json_build_object('sub', v_intruso, 'role', 'authenticated')::text, true);
    select count(*) into v_n from lead where id = v_lead;
    r := r || format('7|Outro usuário não vê o lead|0|%s', v_n);
    select count(*) into v_n from oportunidade where id = v_op;
    r := r || format('7|Outro usuário não vê a oportunidade|0|%s', v_n);

    -- ADMIN ----------------------------------------------------------------
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    insert into lead (nome, telefone, origem, consultor_id, status)
    values ('Lead Admin Teste', '11888880000', 'indicacao', v_consultor, 'atribuido');
    r := r || '8|Admin cria lead para um consultor|ok|ok'::text;
    insert into lead (nome, telefone, origem, status)
    values ('Lead Admin Sem Dono', '11777770000', 'plantao', 'novo');
    r := r || '8|Admin cria lead sem responsável|ok|ok'::text;
    select count(*) into v_n from lead where id = v_lead;
    r := r || format('8|Admin vê lead do consultor|1|%s', v_n);

    -- ANÔNIMO --------------------------------------------------------------
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    begin
      select count(*) into v_n from lead;
    exception when insufficient_privilege then
      v_n := 0;
    end;
    r := r || format('9|Anônimo não lê leads|0|%s', v_n);

    raise exception 'ROLLBACK_LEAD';
  exception when others then
    if sqlerrm <> 'ROLLBACK_LEAD' then
      r := r || format('99|ERRO durante o teste|—|%s', sqlerrm);
    end if;
  end;

  execute 'reset role';
  insert into _verificacao_lead (ordem, teste, esperado, obtido, ok)
  select split_part(x, '|', 1)::int, split_part(x, '|', 2), split_part(x, '|', 3), split_part(x, '|', 4),
         split_part(x, '|', 3) = split_part(x, '|', 4)
  from unnest(r) as x;
end $$;

select ordem, teste, esperado, obtido, ok from _verificacao_lead order by ordem, teste;
