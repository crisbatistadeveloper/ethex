-- Ethex — roteiro por contato dentro da oportunidade.
-- Os imóveis da busca são agrupados por contato (parceiro vinculado ou
-- nome do contato do anúncio). Cada grupo tem um roteiro de abordagem:
-- contato feito → parceria (50/50) → situação dos imóveis → chave/acesso.
-- Visita prévia e visita com o cliente NÃO são duplicadas aqui: continuam
-- nos módulos próprios (visita_previa / visita_cliente) e são só exibidas.

create type contato_parceria_status as enum (
  'pendente',
  'confirmada',
  'recusada'
);

create table contato_oportunidade (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references oportunidade(id) on delete cascade,
  -- Chave de agrupamento: 'parceiro:<uuid>' | 'nome:<normalizado>' | 'sem-contato'
  chave text not null,
  nome text not null,
  contatado_em timestamptz,
  parceria_status contato_parceria_status not null default 'pendente',
  parceria_detalhe text,
  situacao_confirmada_em timestamptz,
  chave_combinada_em timestamptz,
  chave_detalhe text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (oportunidade_id, chave)
);

create index contato_oportunidade_oportunidade_id_idx
  on contato_oportunidade(oportunidade_id);

create trigger contato_oportunidade_set_atualizado_em
  before update on contato_oportunidade
  for each row execute function set_atualizado_em();

alter table contato_oportunidade enable row level security;

-- Segue o dono da oportunidade (padrão 0007).
create policy "consultor_ve_contatos_das_suas_oportunidades" on contato_oportunidade
  for all
  using (exists (
    select 1 from oportunidade o
    where o.id = contato_oportunidade.oportunidade_id
      and (o.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from oportunidade o
    where o.id = contato_oportunidade.oportunidade_id
      and (o.consultor_id = auth.uid() or is_admin())
  ));
