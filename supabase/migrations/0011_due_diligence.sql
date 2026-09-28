-- Ethex — Due diligence prévia do imóvel (análise preliminar)
-- Estende stub imovel_documento (0007); checklist/resultado em imovel_encontrado.
-- Documentos ficam no Imóvel (reutilizáveis). Análiseado da curadoria não altera o fato físico.
-- Aplicar só no ethex-dev.

-- ---------------------------------------------------------------------------
-- Documentos do imóvel (estende stub)
-- ---------------------------------------------------------------------------

-- Status antigos → novos (stub tinha em_analise)
update imovel_documento
set status = 'solicitado'
where status = 'em_analise';

alter table imovel_documento drop constraint if exists imovel_documento_status_check;

alter table imovel_documento
  add constraint imovel_documento_status_check
  check (status in (
    'pendente',
    'solicitado',
    'recebido',
    'aprovado',
    'rejeitado'
  ));

alter table imovel_documento
  add column if not exists data_documento date,
  add column if not exists data_recebimento date,
  add column if not exists storage_path text;

-- Tipologia inicial de documentos
alter table imovel_documento drop constraint if exists imovel_documento_tipo_check;
alter table imovel_documento
  add constraint imovel_documento_tipo_check
  check (tipo in ('matricula', 'iptu', 'outro'));

comment on table imovel_documento is
  'Documentação do imóvel (fato físico). Reutilizável entre curadorias/clientes.';
comment on column imovel_documento.storage_path is
  'Caminho no bucket documentos-imoveis (além da url pública/assinada).';

-- ---------------------------------------------------------------------------
-- Due diligence na curadoria (ImovelEncontrado)
-- ---------------------------------------------------------------------------

alter table imovel_encontrado
  add column if not exists due_diligence_status text not null default 'pendente',
  add column if not exists due_diligence_observacoes text,
  add column if not exists due_diligence_checklist jsonb not null default jsonb_build_object(
    'matricula_atualizada', false,
    'iptu', false,
    'documentacao_recebida', false,
    'analise_inicial', false
  );

alter table imovel_encontrado drop constraint if exists imovel_encontrado_due_diligence_status_check;
alter table imovel_encontrado
  add constraint imovel_encontrado_due_diligence_status_check
  check (due_diligence_status in (
    'pendente',
    'em_analise',
    'aprovado',
    'aprovado_com_ressalvas',
    'reprovado'
  ));

comment on column imovel_encontrado.due_diligence_status is
  'Resultado da análise PRELIMINAR nesta curadoria (não substitui análise jurídica).';
comment on column imovel_encontrado.due_diligence_checklist is
  'Checklist operacional da due diligence prévia nesta curadoria.';

-- ---------------------------------------------------------------------------
-- Storage: documentos do imóvel (mesmo padrão de midia-imoveis, bucket dedicado)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documentos-imoveis', 'documentos-imoveis', true)
on conflict (id) do nothing;

drop policy if exists "authenticated_insert_documentos_imoveis" on storage.objects;
create policy "authenticated_insert_documentos_imoveis" on storage.objects
  for insert with check (
    bucket_id = 'documentos-imoveis' and auth.role() = 'authenticated'
  );

drop policy if exists "authenticated_update_documentos_imoveis" on storage.objects;
create policy "authenticated_update_documentos_imoveis" on storage.objects
  for update using (
    bucket_id = 'documentos-imoveis' and auth.role() = 'authenticated'
  );

drop policy if exists "authenticated_delete_documentos_imoveis" on storage.objects;
create policy "authenticated_delete_documentos_imoveis" on storage.objects
  for delete using (
    bucket_id = 'documentos-imoveis' and auth.role() = 'authenticated'
  );

drop policy if exists "public_read_documentos_imoveis" on storage.objects;
create policy "public_read_documentos_imoveis" on storage.objects
  for select using (bucket_id = 'documentos-imoveis');
