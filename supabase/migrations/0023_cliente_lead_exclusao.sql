-- Ethex — permite excluir cliente/lead do CRM.
-- lead.cliente_id não tinha "on delete", então excluir um cliente já
-- convertido falhava com violação de FK. Troca para "on delete set null":
-- o registro do lead continua (histórico de captação), só perde o vínculo.

alter table lead drop constraint if exists lead_cliente_id_fkey;
alter table lead
  add constraint lead_cliente_id_fkey
  foreign key (cliente_id) references cliente(id) on delete set null;
