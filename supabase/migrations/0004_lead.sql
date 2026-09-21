-- Ethex — captação de leads da página "em breve".
-- Visitantes (anon) só conseguem INSERIR; ninguém de fora lê a lista.

create table lead (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  origem text not null default 'em-breve',
  criado_em timestamptz not null default now(),
  constraint lead_email_formato check (
    length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

create unique index lead_email_unico on lead (lower(email));

alter table lead enable row level security;

create policy "anon_insert_lead" on lead
  for insert to anon with check (true);

create policy "authenticated_all_lead" on lead
  for all to authenticated
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
