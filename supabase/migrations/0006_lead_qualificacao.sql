-- Ethex — landing principal: formulário de qualificação não pede e-mail
-- (nome + whatsapp + motivo + orçamento), então email deixa de ser obrigatório.
-- "finalidade" reaproveita o mesmo enum de perfil.finalidade — o valor passa
-- direto quando o lead vira cliente, sem conversão.

alter table lead alter column email drop not null;

alter table lead
  add column finalidade finalidade_enum,
  add column consentimento_lgpd boolean not null default false;
