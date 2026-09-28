-- Ethex — tipos de parceiro: + proprietário e incorporadora
-- Aplicar só no ethex-dev.

alter table parceiro drop constraint if exists parceiro_tipo_check;

alter table parceiro
  add constraint parceiro_tipo_check
  check (tipo in ('corretor', 'imobiliaria', 'proprietario', 'incorporadora'));

comment on column parceiro.tipo is
  'corretor | imobiliaria | proprietario | incorporadora';
