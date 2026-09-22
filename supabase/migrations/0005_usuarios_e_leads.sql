-- Ethex — múltiplos consultores: papéis, dono do cliente, leads com distribuição,
-- e isolamento por consultor via RLS (admin continua vendo tudo).

create type papel_usuario as enum ('admin', 'consultor');

create table usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel papel_usuario not null default 'consultor',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuario (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'consultor'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill: usuários já existentes em auth.users viram admin (hoje só há um).
insert into usuario (id, nome, papel)
select id, coalesce(raw_user_meta_data->>'nome', split_part(email, '@', 1)), 'admin'
from auth.users
on conflict (id) do update set papel = 'admin';

create function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from usuario where id = auth.uid() and papel = 'admin'
  );
$$ language sql security definer stable set search_path = public;

alter table usuario enable row level security;

create policy "usuario_ve_a_si_mesmo" on usuario
  for select using (id = auth.uid() or is_admin());

create policy "admin_gerencia_usuarios" on usuario
  for all using (is_admin()) with check (is_admin());

-- cliente ganha dono -----------------------------------------------------

alter table cliente add column consultor_id uuid references usuario(id);

update cliente
set consultor_id = (select id from usuario where papel = 'admin' limit 1)
where consultor_id is null;

alter table cliente alter column consultor_id set not null;

drop policy "authenticated_all_cliente" on cliente;
create policy "consultor_ve_seus_clientes" on cliente
  for all
  using (consultor_id = auth.uid() or is_admin())
  with check (consultor_id = auth.uid() or is_admin());

-- perfil / busca / imovel_encontrado seguem o dono do cliente ------------

drop policy "authenticated_all_perfil" on perfil;
create policy "consultor_ve_perfil_dos_seus_clientes" on perfil
  for all
  using (exists (
    select 1 from cliente c
    where c.id = perfil.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from cliente c
    where c.id = perfil.cliente_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

drop policy "authenticated_all_busca" on busca;
create policy "consultor_ve_buscas_dos_seus_clientes" on busca
  for all
  using (exists (
    select 1 from perfil p
    join cliente c on c.id = p.cliente_id
    where p.id = busca.perfil_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from perfil p
    join cliente c on c.id = p.cliente_id
    where p.id = busca.perfil_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

drop policy "authenticated_all_imovel_encontrado" on imovel_encontrado;
create policy "consultor_ve_curadoria_dos_seus_clientes" on imovel_encontrado
  for all
  using (exists (
    select 1 from busca b
    join perfil p on p.id = b.perfil_id
    join cliente c on c.id = p.cliente_id
    where b.id = imovel_encontrado.busca_id
      and (c.consultor_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from busca b
    join perfil p on p.id = b.perfil_id
    join cliente c on c.id = p.cliente_id
    where b.id = imovel_encontrado.busca_id
      and (c.consultor_id = auth.uid() or is_admin())
  ));

-- comissão combinada com o corretor/imobiliária, por curadoria -----------

alter table imovel_encontrado
  add column comissao_combinada boolean not null default false;

-- lead: campos iniciais da landing + distribuição -------------------------

create type lead_status as enum ('novo', 'atribuido', 'convertido', 'descartado');

alter table lead
  add column nome text,
  add column telefone text,
  add column orcamento_min numeric,
  add column orcamento_max numeric,
  add column status lead_status not null default 'novo',
  add column consultor_id uuid references usuario(id),
  add column cliente_id uuid references cliente(id);

drop policy "authenticated_all_lead" on lead;
create policy "consultor_ve_seus_leads" on lead
  for all
  using (consultor_id = auth.uid() or is_admin())
  with check (consultor_id = auth.uid() or is_admin());
-- "anon_insert_lead" (insert público da landing) continua valendo, sem alteração.
