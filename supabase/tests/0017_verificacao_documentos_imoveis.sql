-- Verificação da 0017 (rodar no SQL Editor do ethex-dev DEPOIS de aplicar a 0017).
-- Simula consultor dono, admin, usuário sem autorização e anônimo via RLS.
-- Cria um arquivo/documento de teste e DESFAZ tudo ao final (nada fica gravado).

drop table if exists _verificacao_0017;
create temp table _verificacao_0017 (
  ordem int,
  teste text,
  esperado text,
  obtido text,
  ok boolean
);

do $$
declare
  v_imovel uuid;
  v_consultor uuid;
  v_admin uuid;
  v_intruso uuid := gen_random_uuid();
  v_path text;
  v_path2 text;
  v_n int;
  r text[] := '{}';
begin
  select ie.imovel_id, c.consultor_id
  into v_imovel, v_consultor
  from imovel_encontrado ie
  join busca b on b.id = ie.busca_id
  join perfil p on p.id = b.perfil_id
  join cliente c on c.id = p.cliente_id
  where c.consultor_id is not null
  limit 1;
  if v_imovel is null then
    raise exception 'Nenhuma curadoria com consultor para testar';
  end if;
  select id into v_admin from usuario where papel = 'admin' limit 1;

  v_path := v_imovel::text || '/teste-0017/arquivo.pdf';
  v_path2 := v_imovel::text || '/teste-0017/novo.pdf';

  select count(*) into v_n from storage.buckets where id = 'documentos-imoveis' and public = false;
  r := r || format('0|Bucket documentos-imoveis privado|1|%s', v_n);

  select count(*) into v_n from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname in ('public_read_documentos_imoveis', 'authenticated_insert_documentos_imoveis',
                       'authenticated_update_documentos_imoveis', 'authenticated_delete_documentos_imoveis');
  r := r || format('0|Policies antigas (públicas/amplas) removidas|0|%s', v_n);

  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    insert into storage.objects (bucket_id, name) values ('documentos-imoveis', v_path);
    insert into imovel_documento (imovel_id, tipo, titulo, storage_path)
    values (v_imovel, 'outro', 'teste 0017', v_path);

    -- 1. Consultor dono do cliente
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_consultor, 'role', 'authenticated')::text, true);
    select count(*) into v_n from storage.objects where bucket_id = 'documentos-imoveis' and name = v_path;
    r := r || format('1|Consultor dono: vê o arquivo|1|%s', v_n);
    select count(*) into v_n from imovel_documento where imovel_id = v_imovel and titulo = 'teste 0017';
    r := r || format('1|Consultor dono: vê o registro imovel_documento|1|%s', v_n);

    -- 5. Upload (insert) pelo consultor dono
    begin
      insert into storage.objects (bucket_id, name) values ('documentos-imoveis', v_path2);
      r := r || '5|Consultor dono: upload permitido|ok|ok'::text;
    exception when others then
      r := r || format('5|Consultor dono: upload permitido|ok|erro: %s', sqlerrm);
    end;

    -- 6. Exclusão pelo consultor dono
    delete from storage.objects where bucket_id = 'documentos-imoveis' and name = v_path2;
    get diagnostics v_n = row_count;
    r := r || format('6|Consultor dono: exclusão permitida|1|%s', v_n);

    -- 2. Admin
    if v_admin is null then
      r := r || '2|Admin: vê o arquivo|1|sem admin cadastrado'::text;
    else
      perform set_config('request.jwt.claims',
        json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
      select count(*) into v_n from storage.objects where bucket_id = 'documentos-imoveis' and name = v_path;
      r := r || format('2|Admin: vê o arquivo|1|%s', v_n);
      select count(*) into v_n from imovel_documento where imovel_id = v_imovel and titulo = 'teste 0017';
      r := r || format('2|Admin: vê o registro imovel_documento|1|%s', v_n);
    end if;

    -- 3. Usuário autenticado sem vínculo com o cliente
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_intruso, 'role', 'authenticated')::text, true);
    select count(*) into v_n from storage.objects where bucket_id = 'documentos-imoveis' and name = v_path;
    r := r || format('3|Não autorizado: não vê o arquivo|0|%s', v_n);
    select count(*) into v_n from imovel_documento where imovel_id = v_imovel and titulo = 'teste 0017';
    r := r || format('3|Não autorizado: não vê o registro|0|%s', v_n);
    begin
      insert into storage.objects (bucket_id, name) values ('documentos-imoveis', v_imovel::text || '/teste-0017/intruso.pdf');
      r := r || '3|Não autorizado: upload bloqueado|bloqueado|PERMITIDO'::text;
    exception when others then
      r := r || '3|Não autorizado: upload bloqueado|bloqueado|bloqueado'::text;
    end;
    delete from storage.objects where bucket_id = 'documentos-imoveis' and name = v_path;
    get diagnostics v_n = row_count;
    r := r || format('3|Não autorizado: exclusão bloqueada|0|%s', v_n);

    -- 4. Anônimo
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    begin
      select count(*) into v_n from storage.objects where bucket_id = 'documentos-imoveis' and name = v_path;
    exception when others then
      v_n := 0;
    end;
    r := r || format('4|Anônimo: não vê o arquivo|0|%s', v_n);
    begin
      select count(*) into v_n from imovel_documento where imovel_id = v_imovel;
    exception when others then
      v_n := 0;
    end;
    r := r || format('4|Anônimo: não vê imovel_documento|0|%s', v_n);

    raise exception 'ROLLBACK_0017';
  exception when others then
    if sqlerrm <> 'ROLLBACK_0017' then
      r := r || format('9|ERRO durante o teste|—|%s', sqlerrm);
    end if;
  end;

  insert into _verificacao_0017 (ordem, teste, esperado, obtido, ok)
  select
    split_part(x, '|', 1)::int,
    split_part(x, '|', 2),
    split_part(x, '|', 3),
    split_part(x, '|', 4),
    split_part(x, '|', 3) = split_part(x, '|', 4)
  from unnest(r) as x;
end $$;

select ordem, teste, esperado, obtido, ok from _verificacao_0017 order by ordem, teste;
