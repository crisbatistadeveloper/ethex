-- Ethex — Visita prévia ETHEX (consultor visita o imóvel antes do cliente)
-- Pertence ao Imóvel (reutilizável); pode ligar a um ImovelEncontrado.
-- NÃO altera etapa da oportunidade (Visita no pipeline = visita do cliente, futura).
-- Aplicar só no ethex-dev.

-- ---------------------------------------------------------------------------
-- Visita prévia
-- ---------------------------------------------------------------------------

create type visita_previa_status as enum (
  'agendada',
  'realizada',
  'cancelada'
);

create type visita_recomendacao as enum (
  'recomendar',
  'recomendar_com_ressalvas',
  'nao_recomendar'
);

create table visita_previa (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imovel(id) on delete cascade,
  imovel_encontrado_id uuid references imovel_encontrado(id) on delete set null,
  consultor_id uuid not null references usuario(id),
  data_visita timestamptz,
  status visita_previa_status not null default 'agendada',
  observacoes_gerais text,
  -- Relatório
  avaliacao_geral text,
  pontos_positivos text,
  pontos_negativos text,
  observacoes_relatorio text,
  recomendacao visita_recomendacao,
  -- Observações livres (opcionais)
  obs_conservacao text,
  obs_iluminacao text,
  obs_ventilacao text,
  obs_ruido text,
  obs_vizinhanca text,
  obs_condominio text,
  obs_acesso text,
  obs_localizacao text,
  obs_nao_constam_anuncio text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index visita_previa_imovel_id_idx on visita_previa(imovel_id, data_visita desc);
create index visita_previa_imovel_encontrado_id_idx on visita_previa(imovel_encontrado_id);
create index visita_previa_consultor_id_idx on visita_previa(consultor_id);

create trigger visita_previa_set_atualizado_em
  before update on visita_previa
  for each row execute function set_atualizado_em();

comment on table visita_previa is
  'Visita prévia do consultor ETHEX ao imóvel. Reutilizável entre curadorias. Não é a visita do cliente.';

-- ---------------------------------------------------------------------------
-- Mídia da visita (fotos/vídeos ordenados p/ apresentação futura)
-- ---------------------------------------------------------------------------

create type visita_midia_tipo as enum ('foto', 'video');

create table visita_previa_midia (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references visita_previa(id) on delete cascade,
  tipo visita_midia_tipo not null default 'foto',
  storage_path text not null,
  url text not null,
  descricao text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create index visita_previa_midia_visita_ordem_idx
  on visita_previa_midia(visita_id, ordem);

-- ---------------------------------------------------------------------------
-- RLS — catálogo compartilhado (consultores autenticados), como imovel
-- ---------------------------------------------------------------------------

alter table visita_previa enable row level security;
alter table visita_previa_midia enable row level security;

create policy "authenticated_all_visita_previa" on visita_previa
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "authenticated_all_visita_previa_midia" on visita_previa_midia
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Storage dedicado (padrão midia-imoveis / documentos-imoveis)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('visitas-imoveis', 'visitas-imoveis', true)
on conflict (id) do nothing;

drop policy if exists "authenticated_insert_visitas_imoveis" on storage.objects;
create policy "authenticated_insert_visitas_imoveis" on storage.objects
  for insert with check (
    bucket_id = 'visitas-imoveis' and auth.role() = 'authenticated'
  );

drop policy if exists "authenticated_update_visitas_imoveis" on storage.objects;
create policy "authenticated_update_visitas_imoveis" on storage.objects
  for update using (
    bucket_id = 'visitas-imoveis' and auth.role() = 'authenticated'
  );

drop policy if exists "authenticated_delete_visitas_imoveis" on storage.objects;
create policy "authenticated_delete_visitas_imoveis" on storage.objects
  for delete using (
    bucket_id = 'visitas-imoveis' and auth.role() = 'authenticated'
  );

drop policy if exists "public_read_visitas_imoveis" on storage.objects;
create policy "public_read_visitas_imoveis" on storage.objects
  for select using (bucket_id = 'visitas-imoveis');
