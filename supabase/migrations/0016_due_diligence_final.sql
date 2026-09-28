-- Ethex — Due diligence jurídica FINAL da operação (após negociação aceita)
-- Registro operacional da ETHEX: organiza documentos e pendências da transação.
-- NÃO é parecer jurídico profissional.
-- Reutiliza: negociacao_compra (só leitura), imovel_documento (vínculo, sem copiar
--   arquivo), oportunidade_historico e imovel_encontrado_historico.
-- Arquivos da operação ficam no bucket PRIVADO documentos-operacao (URLs assinadas).
-- NÃO altera etapa da oportunidade (etapa "negociacao" já cobre esta fase).
-- Requer 0015. Aplicar só no ethex-dev.

-- ---------------------------------------------------------------------------
-- Due diligence final (uma por negociação aceita)
-- ---------------------------------------------------------------------------

create type due_diligence_final_status as enum (
  'em_andamento',
  'pendente_documentos',
  'em_analise',
  'aprovada',
  'aprovada_com_ressalvas',
  'reprovada'
);

create type due_diligence_final_recomendacao as enum (
  'prosseguir',
  'prosseguir_com_ressalvas',
  'nao_prosseguir'
);

create table due_diligence_final (
  id uuid primary key default gen_random_uuid(),
  negociacao_id uuid not null unique references negociacao_compra(id) on delete cascade,
  oportunidade_id uuid not null references oportunidade(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  imovel_id uuid not null references imovel(id) on delete cascade,
  imovel_encontrado_id uuid not null references imovel_encontrado(id) on delete cascade,
  consultor_id uuid not null references usuario(id),
  status due_diligence_final_status not null default 'em_andamento',
  -- Registro da análise (operacional, não é parecer jurídico)
  parecer_resumo text,
  pontos_atencao text,
  ressalvas text,
  recomendacao due_diligence_final_recomendacao,
  observacoes text,
  analise_registrada_em timestamptz,
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index due_diligence_final_oportunidade_idx on due_diligence_final(oportunidade_id);
create index due_diligence_final_cliente_idx on due_diligence_final(cliente_id);

create trigger due_diligence_final_set_atualizado_em
  before update on due_diligence_final
  for each row execute function set_atualizado_em();

comment on table due_diligence_final is
  'Due diligence final da transação (registro operacional ETHEX; não substitui advogado). Não altera valores da negociacao_compra.';

-- ---------------------------------------------------------------------------
-- Checklist / documentos da operação
-- ---------------------------------------------------------------------------

create table due_diligence_final_item (
  id uuid primary key default gen_random_uuid(),
  due_diligence_id uuid not null references due_diligence_final(id) on delete cascade,
  categoria text not null check (categoria in (
    'imovel', 'proprietario', 'certidoes', 'condominio', 'outros'
  )),
  titulo text not null,
  status text not null default 'pendente' check (status in (
    'pendente', 'solicitado', 'recebido', 'aprovado', 'rejeitado', 'nao_aplicavel'
  )),
  -- Documento permanente do imóvel (reuso, sem duplicar arquivo)
  imovel_documento_id uuid references imovel_documento(id) on delete set null,
  -- Arquivo específico desta operação (bucket privado documentos-operacao)
  storage_path text,
  nome_arquivo text,
  observacao text,
  recebido_em date,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index due_diligence_final_item_dd_idx on due_diligence_final_item(due_diligence_id, categoria, ordem);

create trigger due_diligence_final_item_set_atualizado_em
  before update on due_diligence_final_item
  for each row execute function set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Pendências
-- ---------------------------------------------------------------------------

create table due_diligence_final_pendencia (
  id uuid primary key default gen_random_uuid(),
  due_diligence_id uuid not null references due_diligence_final(id) on delete cascade,
  descricao text not null,
  categoria text not null default 'outros' check (categoria in (
    'imovel', 'proprietario', 'certidoes', 'condominio', 'outros'
  )),
  responsavel text,
  status text not null default 'aberta' check (status in (
    'aberta', 'em_andamento', 'resolvida', 'dispensada'
  )),
  prazo date,
  observacao text,
  concluida_em timestamptz,
  criado_por uuid references usuario(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index due_diligence_final_pendencia_dd_idx on due_diligence_final_pendencia(due_diligence_id, status);

create trigger due_diligence_final_pendencia_set_atualizado_em
  before update on due_diligence_final_pendencia
  for each row execute function set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Histórico (imutável)
-- ---------------------------------------------------------------------------

create table due_diligence_final_evento (
  id uuid primary key default gen_random_uuid(),
  due_diligence_id uuid not null references due_diligence_final(id) on delete cascade,
  autor_id uuid references usuario(id) on delete set null,
  tipo text not null check (tipo in (
    'iniciada', 'status', 'item', 'documento', 'pendencia', 'analise', 'observacao'
  )),
  detalhe text not null,
  criado_em timestamptz not null default now()
);

create index due_diligence_final_evento_idx on due_diligence_final_evento(due_diligence_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- RLS — dono do cliente ou admin (padrão 0005). Sem policies de delete:
-- itens/pendências são encerrados por status, nunca apagados.
-- ---------------------------------------------------------------------------

alter table due_diligence_final enable row level security;
alter table due_diligence_final_item enable row level security;
alter table due_diligence_final_pendencia enable row level security;
alter table due_diligence_final_evento enable row level security;

create or replace function pode_acessar_due_diligence_final(dd_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from due_diligence_final d
    join cliente c on c.id = d.cliente_id
    where d.id = dd_id
      and (c.consultor_id = auth.uid() or is_admin())
  );
$$;

revoke all on function pode_acessar_due_diligence_final(uuid) from public;
grant execute on function pode_acessar_due_diligence_final(uuid) to authenticated;

create policy "dd_final_select" on due_diligence_final
  for select using (exists (
    select 1 from cliente c
    where c.id = due_diligence_final.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));
-- Só inicia a partir de negociação ACEITA do mesmo cliente/oportunidade/imóvel
create policy "dd_final_insert" on due_diligence_final
  for insert with check (
    exists (
      select 1 from cliente c
      where c.id = due_diligence_final.cliente_id
        and (c.consultor_id = auth.uid() or is_admin())
    )
    and exists (
      select 1 from negociacao_compra n
      where n.id = due_diligence_final.negociacao_id
        and n.status = 'aceita'
        and n.cliente_id = due_diligence_final.cliente_id
        and n.oportunidade_id = due_diligence_final.oportunidade_id
        and n.imovel_encontrado_id = due_diligence_final.imovel_encontrado_id
    )
  );
create policy "dd_final_update" on due_diligence_final
  for update
  using (exists (
    select 1 from cliente c
    where c.id = due_diligence_final.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from cliente c
    where c.id = due_diligence_final.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

create policy "dd_final_item_select" on due_diligence_final_item
  for select using (pode_acessar_due_diligence_final(due_diligence_id));
create policy "dd_final_item_insert" on due_diligence_final_item
  for insert with check (pode_acessar_due_diligence_final(due_diligence_id));
create policy "dd_final_item_update" on due_diligence_final_item
  for update
  using (pode_acessar_due_diligence_final(due_diligence_id))
  with check (pode_acessar_due_diligence_final(due_diligence_id));

create policy "dd_final_pendencia_select" on due_diligence_final_pendencia
  for select using (pode_acessar_due_diligence_final(due_diligence_id));
create policy "dd_final_pendencia_insert" on due_diligence_final_pendencia
  for insert with check (pode_acessar_due_diligence_final(due_diligence_id));
create policy "dd_final_pendencia_update" on due_diligence_final_pendencia
  for update
  using (pode_acessar_due_diligence_final(due_diligence_id))
  with check (pode_acessar_due_diligence_final(due_diligence_id));

-- Histórico: só leitura e inserção
create policy "dd_final_evento_select" on due_diligence_final_evento
  for select using (pode_acessar_due_diligence_final(due_diligence_id));
create policy "dd_final_evento_insert" on due_diligence_final_evento
  for insert with check (pode_acessar_due_diligence_final(due_diligence_id));

-- ---------------------------------------------------------------------------
-- Storage PRIVADO: documentos-operacao
-- Caminho: {cliente_id}/{due_diligence_id}/{item_id}/{arquivo}
-- Acesso só ao dono do cliente (1ª pasta) ou admin; leitura por URL assinada.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documentos-operacao', 'documentos-operacao', false)
on conflict (id) do update set public = false;

drop policy if exists "dono_select_documentos_operacao" on storage.objects;
create policy "dono_select_documentos_operacao" on storage.objects
  for select to authenticated using (
    bucket_id = 'documentos-operacao'
    and exists (
      select 1 from public.cliente c
      where c.id::text = (storage.foldername(name))[1]
        and (c.consultor_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "dono_insert_documentos_operacao" on storage.objects;
create policy "dono_insert_documentos_operacao" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'documentos-operacao'
    and exists (
      select 1 from public.cliente c
      where c.id::text = (storage.foldername(name))[1]
        and (c.consultor_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Históricos aceitam due_diligence
-- ---------------------------------------------------------------------------

alter table oportunidade_historico
  drop constraint if exists oportunidade_historico_tipo_check;
alter table oportunidade_historico
  add constraint oportunidade_historico_tipo_check
  check (tipo in (
    'criacao', 'etapa', 'status', 'nota', 'visita', 'decisao', 'negociacao', 'due_diligence'
  ));

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
    'visita',
    'decisao',
    'compra',
    'due_diligence'
  ));
