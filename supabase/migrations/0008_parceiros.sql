-- Ethex — Parceiros V1
-- Estende o stub `parceiro` da 0007; cria histórico de relacionamento.
-- Não altera produção nesta etapa (aplicar só no ethex-dev).

-- ---------------------------------------------------------------------------
-- Campos de cadastro + política de parceria
-- ---------------------------------------------------------------------------

alter table parceiro
  add column if not exists imobiliaria_nome text,
  add column if not exists whatsapp text,
  add column if not exists cidade_regiao text,
  add column if not exists modelo_divisao text,
  add column if not exists condicoes_parceria text,
  add column if not exists ultima_negociacao_em timestamptz;

comment on column parceiro.nome is 'Nome do corretor ou da imobiliária';
comment on column parceiro.imobiliaria_nome is 'Imobiliária vinculada (quando o parceiro é corretor)';
comment on column parceiro.contato_telefone is 'Telefone principal';
comment on column parceiro.whatsapp is 'WhatsApp (pode diferir do telefone)';
comment on column parceiro.politica_comissao is 'Percentual/comissão padrão conhecida (texto livre, ex.: 50% ou 6%)';
comment on column parceiro.modelo_divisao is 'Modelo de divisão habitual (ex.: 50/50)';
comment on column parceiro.condicoes_parceria is 'Condições específicas desta parceria';
comment on column parceiro.ultima_negociacao_em is 'Data da última negociação registrada';

create index if not exists parceiro_ativo_nome_idx on parceiro(ativo, nome);
create index if not exists parceiro_cidade_regiao_idx on parceiro(cidade_regiao);
create index if not exists parceiro_tipo_idx on parceiro(tipo);

-- ---------------------------------------------------------------------------
-- Histórico / timeline de relacionamento
-- ---------------------------------------------------------------------------

create table if not exists parceiro_historico (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references parceiro(id) on delete cascade,
  autor_id uuid references usuario(id) on delete set null,
  tipo text not null check (tipo in (
    'negociacao_comissao',
    'documentacao',
    'atendimento',
    'velocidade_resposta',
    'observacao',
    'outro'
  )),
  titulo text not null,
  detalhe text,
  criado_em timestamptz not null default now()
);

create index if not exists parceiro_historico_parceiro_id_idx
  on parceiro_historico(parceiro_id, criado_em desc);

alter table parceiro_historico enable row level security;

-- Consultores autenticados leem/escrevem (catálogo compartilhado de parceiros,
-- igual ao stub da 0007). Admin incluso via authenticated.
drop policy if exists "authenticated_all_parceiro_historico" on parceiro_historico;
create policy "authenticated_all_parceiro_historico" on parceiro_historico
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Trigger: ao registrar negociação de comissão, atualiza última negociação
create or replace function public.parceiro_historico_atualiza_negociacao()
returns trigger as $$
begin
  if new.tipo = 'negociacao_comissao' then
    update parceiro
    set ultima_negociacao_em = new.criado_em
    where id = new.parceiro_id
      and (ultima_negociacao_em is null or ultima_negociacao_em < new.criado_em);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists parceiro_historico_set_negociacao on parceiro_historico;
create trigger parceiro_historico_set_negociacao
  after insert on parceiro_historico
  for each row execute function public.parceiro_historico_atualiza_negociacao();
