-- Ethex — Hardening: documentos do imóvel ficam PRIVADOS
-- Antes (0007/0011): bucket documentos-imoveis público (leitura anônima) e
--   imovel_documento/objetos liberados para qualquer usuário autenticado.
-- Agora: admin → tudo; consultor → só imóveis que estão na curadoria de um
--   cliente seu; anônimo → nada. Leitura de arquivos só por URL assinada.
-- Não altera midia-imoveis, visitas-imoveis nem documentos-operacao.
-- Requer 0011. Aplicar só no ethex-dev.

-- ---------------------------------------------------------------------------
-- Regra de acesso (reutilizada por imovel_documento e pelo Storage)
-- Recebe texto porque no Storage vem da 1ª pasta do caminho ({imovel_id}/...).
-- ---------------------------------------------------------------------------

create or replace function pode_acessar_documentos_do_imovel(p_imovel_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      is_admin()
      or exists (
        select 1
        from imovel_encontrado ie
        join busca b on b.id = ie.busca_id
        join perfil p on p.id = b.perfil_id
        join cliente c on c.id = p.cliente_id
        where ie.imovel_id::text = p_imovel_id
          and c.consultor_id = auth.uid()
      )
    );
$$;

revoke all on function pode_acessar_documentos_do_imovel(text) from public;
grant execute on function pode_acessar_documentos_do_imovel(text) to authenticated;

-- ---------------------------------------------------------------------------
-- imovel_documento: substitui "authenticated_all_imovel_documento" (0007)
-- ---------------------------------------------------------------------------

drop policy if exists "authenticated_all_imovel_documento" on imovel_documento;

create policy "imovel_documento_select" on imovel_documento
  for select to authenticated
  using (pode_acessar_documentos_do_imovel(imovel_id::text));

create policy "imovel_documento_insert" on imovel_documento
  for insert to authenticated
  with check (pode_acessar_documentos_do_imovel(imovel_id::text));

create policy "imovel_documento_update" on imovel_documento
  for update to authenticated
  using (pode_acessar_documentos_do_imovel(imovel_id::text))
  with check (pode_acessar_documentos_do_imovel(imovel_id::text));

-- Documento é reutilizado entre curadorias: só admin apaga o registro.
create policy "imovel_documento_delete_admin" on imovel_documento
  for delete to authenticated
  using (is_admin());

-- ---------------------------------------------------------------------------
-- Storage: bucket privado + policies por imóvel (substitui as da 0011)
-- ---------------------------------------------------------------------------

update storage.buckets set public = false where id = 'documentos-imoveis';

drop policy if exists "public_read_documentos_imoveis" on storage.objects;
drop policy if exists "authenticated_insert_documentos_imoveis" on storage.objects;
drop policy if exists "authenticated_update_documentos_imoveis" on storage.objects;
drop policy if exists "authenticated_delete_documentos_imoveis" on storage.objects;

create policy "documentos_imoveis_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos-imoveis'
    and public.pode_acessar_documentos_do_imovel((storage.foldername(name))[1])
  );

create policy "documentos_imoveis_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos-imoveis'
    and public.pode_acessar_documentos_do_imovel((storage.foldername(name))[1])
  );

create policy "documentos_imoveis_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documentos-imoveis'
    and public.pode_acessar_documentos_do_imovel((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'documentos-imoveis'
    and public.pode_acessar_documentos_do_imovel((storage.foldername(name))[1])
  );

create policy "documentos_imoveis_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documentos-imoveis'
    and public.pode_acessar_documentos_do_imovel((storage.foldername(name))[1])
  );

-- ---------------------------------------------------------------------------
-- Dados: remove URLs públicas permanentes já gravadas (o caminho fica em
-- storage_path; a tela gera URL assinada). Links externos digitados não mudam.
-- ---------------------------------------------------------------------------

update imovel_documento
set
  storage_path = coalesce(
    storage_path,
    regexp_replace(url, '^.*/storage/v1/object/public/documentos-imoveis/', '')
  ),
  url = null
where url like '%/storage/v1/object/public/documentos-imoveis/%';

comment on column imovel_documento.storage_path is
  'Caminho no bucket PRIVADO documentos-imoveis ({imovel_id}/{documento_id}/arquivo). Acesso só por URL assinada.';
comment on column imovel_documento.url is
  'Somente link externo informado manualmente. Nunca gravar URL pública do Storage.';
